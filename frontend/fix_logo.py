from PIL import Image

def fix_logo():
    input_path = 'src/assets/logo.png'
    output_path = 'src/assets/logo_white.png'

    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []

        # Target RED Color (approx based on debug): 156, 0, 1
        # Target WHITE (text): likely > 200, > 200, > 200

        for item in datas:
            r, g, b, a = item

            # Is it RED-ish? (Background)
            # High Red, Low Green/Blue
            if r > 100 and g < 100 and b < 100:
                # Make Transparent
                newData.append((255, 255, 255, 0))
            
            # Is it blended/pinkish (aliasing)?
            # If it has significant Red but also some Green/Blue (lighter), it might be edge
            # OR if it's dark red (shadow).
            
            # Let's try a simple approach first: 
            # If it is NOT the background red, make it WHITE.
            # This covers white text, grey shadows, and aliasing (turning them white might make edges sharp but visible)
            else:
                newData.append((255, 255, 255, 255))

        img.putdata(newData)
        img.save(output_path, "PNG")
        print("Logo processed: Red removed, everything else is now WHITE.")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    fix_logo()
