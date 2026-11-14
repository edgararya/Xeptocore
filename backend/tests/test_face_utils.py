"""Face detection and cropping, with the detector faked.

The real YuNet model is not needed (or available) here, and no real face images
are used: the fake detector reports boxes on blank pictures.
"""

import numpy as np
import pytest

from app import face_utils as fu


def face_row(x, y, w, h, score=0.95):
    """One detection row in YuNet's format: box, five landmarks, score."""
    return [x, y, w, h] + [0.0] * 10 + [score]


class FakeYuNet:
    """Stands in for cv2.FaceDetectorYN and checks it is used correctly."""

    def __init__(self, rows):
        self.rows = rows
        self.input_size = None
        self.seen_size = None

    def setInputSize(self, size):
        self.input_size = size

    def detect(self, image):
        height, width = image.shape[:2]
        assert (width, height) == self.input_size, "setInputSize must match the image"
        self.seen_size = (width, height)
        faces = np.array(self.rows, dtype=np.float32) if self.rows else None
        return 1, faces


@pytest.fixture
def use_yunet(monkeypatch):
    def install(rows):
        detector = FakeYuNet(rows)
        monkeypatch.setattr(fu, "_yunet", detector)
        return detector

    return install


def blank(height, width):
    return np.zeros((height, width, 3), dtype=np.uint8)


def expected_box(face_x, face_y, face_w, face_h, width, height):
    """The crop the module should produce: a clipped square around the face."""
    center_x = face_x + face_w // 2
    center_y = face_y + face_h // 2
    half = int(max(face_w, face_h) * fu.CROP_MARGIN) // 2
    left, top = max(0, center_x - half), max(0, center_y - half)
    right, bottom = min(width, center_x + half), min(height, center_y + half)
    return [left, top, right - left, bottom - top]


def test_the_largest_face_is_cropped_with_a_margin(use_yunet):
    # The small face is listed first, so taking the first detection would be wrong.
    use_yunet([face_row(400, 50, 40, 40), face_row(100, 100, 120, 150)])

    crop, box = fu.detect_and_crop_face(blank(480, 640))

    assert box == expected_box(100, 100, 120, 150, 640, 480)
    assert crop.shape[:2] == (box[3], box[2])
    assert crop.shape[2] == 3
    assert box[2] > 150  # larger than the face itself: the margin is included


def test_large_images_are_shrunk_for_detection_and_boxes_scaled_back(use_yunet):
    detector = use_yunet([face_row(480, 180, 240, 300)])  # in the shrunken image's coordinates

    crop, box = fu.detect_and_crop_face(blank(1500, 2000))

    assert detector.seen_size == (960, 720)  # long side limited to DETECT_MAX_SIDE
    assert box == expected_box(1000, 375, 500, 625, 2000, 1500)  # back in original coordinates
    assert crop.shape[:2] == (box[3], box[2])


def test_small_images_are_not_enlarged(use_yunet):
    detector = use_yunet([face_row(10, 10, 100, 100)])

    fu.detect_and_crop_face(blank(240, 320))

    assert detector.seen_size == (320, 240)


def test_faces_smaller_than_the_minimum_are_ignored(use_yunet):
    use_yunet([face_row(10, 10, fu.MIN_FACE_SIDE - 1, fu.MIN_FACE_SIDE - 1)])

    assert fu.detect_and_crop_face(blank(480, 640)) == (None, None)


def test_a_face_at_the_minimum_size_is_accepted(use_yunet):
    use_yunet([face_row(100, 100, fu.MIN_FACE_SIDE, fu.MIN_FACE_SIDE)])

    crop, box = fu.detect_and_crop_face(blank(480, 640))

    assert crop is not None
    assert box is not None


def test_a_face_partly_outside_the_image_is_clipped_not_an_error(use_yunet):
    use_yunet([face_row(-30, 40, 120, 150)])

    crop, box = fu.detect_and_crop_face(blank(480, 640))

    left, top, width, height = box
    assert left == 0
    assert top >= 0 and top + height <= 480
    assert left + width <= 640
    assert crop.shape[:2] == (height, width)


def test_no_detections_means_no_face(use_yunet):
    use_yunet([])

    assert fu.detect_and_crop_face(blank(480, 640)) == (None, None)


@pytest.mark.parametrize(
    "make",
    [
        lambda: np.zeros((480, 640), dtype=np.uint8),       # grayscale
        lambda: np.zeros((480, 640, 4), dtype=np.uint8),    # BGRA
    ],
    ids=["grayscale", "bgra"],
)
def test_grayscale_and_alpha_images_are_accepted(use_yunet, make):
    use_yunet([face_row(100, 100, 120, 150)])

    crop, _ = fu.detect_and_crop_face(make())

    assert crop.ndim == 3 and crop.shape[2] == 3


def test_missing_or_empty_input_is_not_an_error():
    assert fu.detect_and_crop_face(None) == (None, None)
    assert fu.detect_and_crop_face(np.zeros((0, 0, 3), dtype=np.uint8)) == (None, None)


def test_without_any_detector_nothing_is_found(monkeypatch):
    monkeypatch.setattr(fu, "_yunet", None)
    monkeypatch.setattr(fu, "_cascade", None)

    assert fu.get_face_detector_name() == "none"
    assert fu.detect_and_crop_face(blank(480, 640)) == (None, None)


def test_detector_name_reports_which_detector_is_active(monkeypatch):
    monkeypatch.setattr(fu, "_yunet", object())
    assert fu.get_face_detector_name() == "yunet"

    monkeypatch.setattr(fu, "_yunet", None)
    monkeypatch.setattr(fu, "_cascade", object())
    assert fu.get_face_detector_name() == "haar"


def test_the_haar_fallback_rejects_pictures_without_faces(monkeypatch):
    """The fallback must not 'find' faces in noise, blanks, or gradients."""
    cascade = fu._load_cascade()
    if cascade is None:
        pytest.skip("OpenCV's bundled Haar cascade is not available")
    monkeypatch.setattr(fu, "_yunet", None)
    monkeypatch.setattr(fu, "_cascade", cascade)

    rng = np.random.default_rng(1)
    gradient = np.tile(np.linspace(0, 255, 1280, dtype=np.uint8), (720, 1))
    pictures = [
        rng.integers(0, 255, (720, 1280, 3), dtype=np.uint8),
        blank(720, 1280),
        np.dstack([gradient] * 3),
    ]

    for picture in pictures:
        assert fu.detect_and_crop_face(picture) == (None, None)