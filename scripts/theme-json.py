"""Back up content imports and compare remote JSON using raw file hashes."""
import hashlib
import json
from pathlib import Path
import shutil
import sys
import zipfile


def files(root):
    return {p.relative_to(root).as_posix(): p for p in root.rglob("*.json") if p.is_file()}


def validate(root):
    result = files(root)
    if "config/settings_data.json" not in result or not any(n.startswith("templates/") for n in result):
        sys.exit("快照缺少配置或模板 JSON，已停止，请检查下载结果。")
    return result


def content_file(name):
    return name == "config/settings_data.json" or name.startswith(("templates/", "sections/"))


def import_content(root, run_dir):
    incoming = validate(run_dir / "remote")
    if any(not content_file(name) for name in incoming):
        sys.exit("下载结果包含内容范围之外的 JSON，已停止。")
    local = {}
    for folder in ("config", "templates", "sections"):
        for path in (root / folder).rglob("*.json"):
            name = path.relative_to(root).as_posix()
            if path.is_file() and content_file(name):
                local[name] = path
    with zipfile.ZipFile(run_dir / "local-json.zip", "x", zipfile.ZIP_DEFLATED) as backup:
        for name, path in local.items():
            backup.write(path, name)
    report = {"synced": sorted(incoming), "created": sorted(incoming.keys() - local.keys()),
              "local_only_preserved": sorted(local.keys() - incoming.keys())}
    (run_dir / "import-report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    for name, path in incoming.items():
        target = root / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
    print(f"已同步 {len(incoming)} 个内容 JSON；代码、翻译及本地独有文件保留。")
    print(f"本地 JSON 备份：{run_dir / 'local-json.zip'}")


def verify(before, after):
    def digest(paths):
        return {n: hashlib.sha256(p.read_bytes()).hexdigest() for n, p in paths.items()}
    old, new = digest(validate(before)), digest(validate(after))
    report = {"before_count": len(old), "after_count": len(new),
              "changed": sorted(n for n in old.keys() & new.keys() if old[n] != new[n]),
              "added": sorted(new.keys() - old.keys()), "removed": sorted(old.keys() - new.keys())}
    (after.parent / "verification.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    if old != new:
        print(json.dumps(report, ensure_ascii=False, indent=2), file=sys.stderr)
        sys.exit("线上 JSON 存在差异，可能包含同期后台编辑。请检查快照；不会自动回滚。")
    print(f"推送和核对完成：{len(old)} 个线上 JSON 完全一致，无新增、删除或修改。")


if __name__ == "__main__":
    operation, *arguments = sys.argv[1:]
    paths = [Path(argument).resolve() for argument in arguments]
    if operation == "validate":
        validate(*paths)
    elif operation == "import":
        import_content(*paths)
    elif operation == "verify":
        verify(*paths)
    else:
        sys.exit("Unknown operation")
