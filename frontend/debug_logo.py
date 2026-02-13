from PIL import Image

def debug_logo():
    try:
        img = Image.open('src/assets/logo.png').convert("RGBA")
        width, height = img.size
        pixels = img.load()

        print(f"Image Size: {width}x{height}")
        print(f"Top-Left (0,0): {pixels[0,0]}")
        print(f"Top-Right: {pixels[width-1, 0]}")
        print(f"Center: {pixels[width//2, height//2]}")
        
        # Sample a few more
        print(f"Pixel at 10,10: {pixels[10,10]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_logo()
