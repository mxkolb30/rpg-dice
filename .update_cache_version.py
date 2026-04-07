import hashlib
import os
import re

def get_file_hash(filepath):
    # Handle the empty string which usually points to index.html in the service worker
    if filepath == '':
        filepath = 'index.html'
    
    if not os.path.isfile(filepath):
        return ""
    
    hasher = hashlib.md5()
    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            hasher.update(chunk)
    return hasher.hexdigest()

def update_sw():
    sw_path = 'sw.js'
    if not os.path.exists(sw_path):
        print("sw.js not found.")
        return

    with open(sw_path, 'r') as f:
        content = f.read()

    # Find the ASSETS array to know which files to hash
    match = re.search(r'const ASSETS = \[(.*?)\]', content, re.DOTALL)
    if not match:
        print("Could not find ASSETS array in sw.js")
        return

    assets_str = match.group(1)
    assets = re.findall(r"'(.*?)'", assets_str)

    # Compute a combined hash of all asset contents
    combined_hash = hashlib.md5()
    for asset in assets:
        h = get_file_hash(asset)
        combined_hash.update(h.encode())

    version_hash = combined_hash.hexdigest()[:8]
    new_cache_name = f"rpgdice-v{version_hash}"

    # Update CACHE_NAME in the file
    new_content = re.sub(
        r"const CACHE_NAME = '.*?';",
        f"const CACHE_NAME = '{new_cache_name}';",
        content
    )

    if content != new_content:
        with open(sw_path, 'w') as f:
            f.write(new_content)
        print(f"Updated cache version to: {new_cache_name}")
    else:
        print("Cache version is already up to date.")

if __name__ == "__main__":
    update_sw()
