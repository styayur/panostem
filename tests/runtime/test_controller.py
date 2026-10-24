import importlib.util
import io
import json
from pathlib import Path
import shutil
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("controller", ROOT / "src-tauri/runtime/controller.py")
c = importlib.util.module_from_spec(spec)
spec.loader.exec_module(c)


class ProjectContracts(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        worker = self.root / "worker"
        shutil.copytree(ROOT / "src-tauri/runtime/examples", worker / "examples")
        shutil.copyfile(ROOT / "src/lib/concepts.json", worker / "concepts.json")
        c.HERE = worker
        self.project = self.root / "project"
        self.info = c.create_project({"project": str(self.project), "template": "physics"})

    def tearDown(self):
        self.tmp.cleanup()

    def test_all_templates_are_parseable_with_optional_metadata(self):
        for template in ("blank", "curves", "geometry3d", "physics", "updater"):
            info = c.create_project({"project": str(self.root/template), "template": template})
            self.assertTrue(info["scenes"])
            self.assertEqual(info["errors"], [])
            c.validate_metadata(info["metadata"])

    def test_open_and_discovery_never_execute_project(self):
        sentinel = self.root / "executed"
        (self.project/"main.py").write_text(f"open({str(sentinel)!r}, 'w').write('bad')\nclass Custom(Scene):\n    pass\n")
        info = c.inspect_project(self.project)
        self.assertEqual(info["scenes"][0]["name"], "Custom")
        self.assertFalse(sentinel.exists())

    def test_ordinary_project_and_syntax_location(self):
        (self.project/"panostem.json").unlink()
        self.assertIsNone(c.inspect_project(self.project)["metadata"])
        (self.project/"main.py").write_text("def invalid(\n")
        self.assertEqual(c.inspect_project(self.project)["errors"][0]["line"], 1)

    def test_scene_discovery_follows_local_inheritance_not_mobjects(self):
        (self.project/"helpers.py").write_text("from manimlib import Scene as Base\nclass SharedScene(Base):\n    pass\nclass CustomDot(Dot):\n    pass\n")
        (self.project/"main.py").write_text("from helpers import SharedScene as Parent\nclass 振动场景(Parent):\n    pass\n",encoding="utf-8")
        names={item["name"] for item in c.inspect_project(self.project)["scenes"]}
        self.assertEqual(names,{"SharedScene","振动场景"})

    def test_save_nested_module_changes_revision_and_preserves_others(self):
        before = (self.project/"main.py").read_bytes()
        info = c.main({"action":"save","project":str(self.project),"file":"helpers/math.py","text":"VALUE = 2\n"})
        self.assertNotEqual(info["revision"], self.info["revision"])
        self.assertEqual(before,(self.project/"main.py").read_bytes())
        self.assertEqual(c.main({"action":"read","project":str(self.project),"file":"helpers/math.py"})["text"],"VALUE = 2\n")

    def test_root_alias_is_canonical_before_containment_checks(self):
        alias = self.project / ".." / self.project.name
        info = c.inspect_project(alias)
        self.assertEqual(info["revision"], self.info["revision"])
        self.assertEqual(c.inside(alias, "main.py"), (self.project / "main.py").resolve())
        archive = self.root / "alias.zip"
        c.export_project(alias, {"archive": str(archive)})
        self.assertTrue(archive.is_file())

    def test_paths_fail_closed(self):
        for path in ("../x", "/x", "a/../b", "C:/x", "a\\b", "a//b", "a/./b", "NUL.txt", "a.", "a/", "a\x00b"):
            with self.subTest(path=path), self.assertRaises(ValueError):
                c.inside(self.project,path)

    def test_archive_round_trip_omits_secrets_outputs_and_environment(self):
        (self.project/".env.private").write_text("SECRET")
        (self.project/".ENV.PRIVATE2").write_text("SECRET")
        (self.project/"renders").mkdir()
        (self.project/"renders/private.txt").write_text("output")
        archive = self.root/"project.zip"
        c.export_project(self.project,{"archive":str(archive)})
        info=c.import_project({"archive":str(archive),"project":str(self.root/"imported")})
        self.assertEqual(self.info["revision"],info["revision"])
        with self.assertRaises(ValueError):
            c.import_project({"archive":str(archive),"project":str(self.project)})

    def test_archive_traversal_symlink_duplicates_and_conflicts(self):
        for names in (["../escape"],["a.py","A.py"],["a","a/b.py"]):
            stream=io.BytesIO()
            with zipfile.ZipFile(stream,"w") as z:
                for name in names:z.writestr(name,"pass")
            stream.seek(0)
            with zipfile.ZipFile(stream) as z, self.assertRaises(ValueError):c.zip_entries(z)
        stream=io.BytesIO()
        with zipfile.ZipFile(stream,"w") as z:
            item=zipfile.ZipInfo("link.py");item.external_attr=0o120777<<16;z.writestr(item,"../outside")
        stream.seek(0)
        with zipfile.ZipFile(stream) as z,self.assertRaises(ValueError):c.zip_entries(z)

    def test_metadata_unknown_concepts_and_versions_are_rejected(self):
        for patch in ({"concept_ids":["made-up"]},{"concept_ids":None},{"learning_objectives":None},{"version":2},{"entry":"../escape.py"},{"scene":"bad;command"}):
            with self.assertRaises(ValueError):c.validate_metadata({**self.info["metadata"],**patch})

    def test_parameter_contract_validates_type_range_default(self):
        specs=self.info["metadata"]["parameters"]
        self.assertEqual(c.parameter_values(specs,{}),{"omega":2})
        for values in ({"omega":True},{"omega":float("nan")},{"omega":100},{"omega":"2"},{"unknown":2}):
            with self.assertRaises(ValueError):c.parameter_values(specs,values)

    def test_run_requires_explicit_current_revision_trust(self):
        with self.assertRaisesRegex(ValueError,"authorization"):
            c.run_scene(self.project,{"trust":False})
        with self.assertRaisesRegex(ValueError,"changed"):
            c.run_scene(self.project,{"trust":True,"revision":"old"})

    def test_dependencies_need_separate_review_and_exact_pypi_versions(self):
        with self.assertRaisesRegex(ValueError,"Separate"):
            c.install_dependencies(self.project,{})
        (self.project/"requirements.txt").write_text("--index-url https://example.com\n")
        info=c.inspect_project(self.project)
        with self.assertRaisesRegex(ValueError,"exact PyPI"):
            c.install_dependencies(self.project,{"authorize_dependencies":True,"revision":info["revision"]})

    def test_environment_excludes_secrets_and_injection(self):
        import os
        os.environ["PANOSTEM_TEST_SECRET"]="private"
        os.environ["PYTHONPATH"]="untrusted"
        env=c.safe_env({"runtime_root":str(self.root)})
        self.assertNotIn("PANOSTEM_TEST_SECRET",env)
        self.assertNotIn("PYTHONPATH",env)
        self.assertEqual(env["PANOSTEM_PARAMETERS"],"{}")

    def test_asset_import_and_recoverable_trash(self):
        source=self.root/"image.png"
        source.write_bytes(b"project asset")
        c.main({"action":"add_asset","project":str(self.project),"source":str(source),"file":"assets/image.png"})
        self.assertEqual((self.project/"assets/image.png").read_bytes(),source.read_bytes())
        with self.assertRaises(ValueError):
            c.main({"action":"add_asset","project":str(self.project),"source":str(source),"file":"assets/image.png"})
        c.main({"action":"trash","project":str(self.project),"file":"assets/image.png"})
        self.assertFalse((self.project/"assets/image.png").exists())
        self.assertEqual(len(list((self.project/".panostem/trash").glob("*/assets/image.png"))),1)

    def test_invalid_render_options_fail_before_start(self):
        base={"trust":True,"revision":self.info["revision"],"entry":"main.py","scene":"OscillatorScene","runtime_root":str(self.root/"runtime")}
        for patch in ({"entry":"../outside.py"},{"scene":"Bad;command"},{"resolution":"1x1"},{"resolution":"853x480"},
                      {"resolution":"8192x4096"},{"fps":True},{"fps":121},{"format":"exe"},{"mode":"shell"}):
            with self.subTest(patch=patch),self.assertRaises(ValueError):c.run_scene(self.project,{**base,**patch})
        self.assertFalse((self.project/"renders").exists())

    def test_sandbox_configuration_limits_host_sharing(self):
        import xml.etree.ElementTree as ET
        tree=ET.fromstring(c.sandbox_config(self.root/"runtime & name",self.root/"sandbox"))
        self.assertEqual(tree.findtext("Networking"),"Disable")
        self.assertEqual(tree.findtext("ClipboardRedirection"),"Disable")
        folders=tree.findall("MappedFolders/MappedFolder")
        self.assertEqual(len(folders),6)
        self.assertEqual([f.findtext("ReadOnly") for f in folders],["true"]*5+["false"])
        self.assertTrue(all("cache" not in f.findtext("HostFolder") for f in folders))


if __name__ == "__main__":unittest.main()
