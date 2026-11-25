import ast
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def portrait_roster():
    module = ast.parse((ROOT / "render_faces.py").read_text())
    for node in module.body:
        if isinstance(node, ast.Assign) and any(
            isinstance(target, ast.Name) and target.id == "AVATARS"
            for target in node.targets
        ):
            return ast.literal_eval(node.value)
    raise AssertionError("render_faces.py has no AVATARS roster")


class PortraitSourceTests(unittest.TestCase):
    def test_portraits_use_intact_high_detail_meshes(self):
        roster = portrait_roster()
        self.assertEqual(len(roster), 9)
        self.assertEqual(len({name for name, _ in roster}), 9)
        for name, relative_path in roster:
            with self.subTest(name=name):
                if name != "lofi":
                    self.assertIn("/characters/audience/", relative_path)
                    self.assertNotIn("/characters/audience_lod/", relative_path)
                self.assertTrue((ROOT / relative_path).is_file())


if __name__ == "__main__":
    unittest.main()
