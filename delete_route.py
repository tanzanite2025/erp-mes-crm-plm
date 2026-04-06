import os
path = r"c:\Users\P16V\Desktop\纤镀软件开发\XDFC\src\routes\_authenticated\finance.tsx"
if os.path.exists(path):
    os.remove(path)
    print(f"Successfully deleted {path}")
else:
    print(f"File {path} not found")
