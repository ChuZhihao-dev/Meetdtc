"""Audit locale coverage; optionally fill missing keys from the English defaults.

Existing translations are never replaced. Added English strings are fallbacks,
not completed translations. Use --report to keep a localization handover list.
"""

import argparse
import copy
import json
from pathlib import Path
import re


TOKENS = re.compile(r'"(?:\\.|[^"\\])*"|/\*[\s\S]*?\*/|//[^\r\n]*')


def read_locale(path):
    source = path.read_text(encoding="utf-8")
    clean = TOKENS.sub(lambda match: match[0] if match[0].startswith('"') else "", source)
    return source, json.loads(clean)


def fill_missing(target, defaults, prefix=""):
    missing = []
    for key, value in defaults.items():
        full_key = f"{prefix}.{key}" if prefix else key
        if key not in target:
            target[key] = copy.deepcopy(value)
            if isinstance(value, dict):
                missing.extend(fill_missing({}, value, full_key))
            else:
                missing.append(full_key)
        elif isinstance(value, dict) and isinstance(target[key], dict):
            missing.extend(fill_missing(target[key], value, full_key))
        elif isinstance(value, dict) != isinstance(target[key], dict):
            raise ValueError(f"Incompatible translation structure: {full_key}")
    return missing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Add English fallbacks for missing keys")
    parser.add_argument("--report", type=Path, help="Write the missing-key inventory as JSON")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1] / "locales"
    defaults = {
        False: read_locale(root / "en.default.json")[1],
        True: read_locale(root / "en.default.schema.json")[1],
    }
    report = {}
    for path in sorted(root.glob("*.json")):
        if path.name.startswith("en.default."):
            continue
        source, locale = read_locale(path)
        missing = fill_missing(locale, defaults[path.name.endswith(".schema.json")])
        if missing:
            report[path.name] = missing
            if args.write:
                # Preserve Shopify's generated-file notice and the original key order.
                header = source[:source.index("{")]
                path.write_text(header + json.dumps(locale, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.report:
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(map(len, report.values()))
    print(f"{'Added English fallbacks for' if args.write else 'Missing'} {total} keys in {len(report)} locale files.")
    return 0 if args.write or not report else 1


if __name__ == "__main__":
    raise SystemExit(main())
