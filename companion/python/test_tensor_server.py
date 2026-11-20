import unittest
from tensor_server import tensor_payload


class TensorContractTests(unittest.TestCase):
    def test_supported_shapes_and_formula(self):
        payload = tensor_payload(4)
        self.assertEqual(payload["shape_4d"], [4, 4, 4, 4])
        self.assertEqual(payload["shape_2d"], [16, 16])
        self.assertEqual(payload["min_val"], 0)
        self.assertEqual(payload["max_val"], 12)
        self.assertEqual(payload["checksum"], 1536)
        self.assertEqual(payload["matrix_2d"][0][0], 0)
        self.assertEqual(payload["matrix_2d"][5][7], 6)

    def test_rejects_unsupported_size(self):
        with self.assertRaisesRegex(ValueError, "one of 4, 6, 8"):
            tensor_payload(5)


if __name__ == "__main__":
    unittest.main()
