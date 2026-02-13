from PIL import Image

def analyze_and_process_logo():
    input_path = 'src/assets/logo.png'
    output_path = 'src/assets/logo_transparent.png'

    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        r_total, g_total, b_total, count = 0, 0, 0, 0

        for item in datas:
            # Check for white (allow some tolerance)
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                newData.append((255, 255, 255, 0)) # Make transparent
            else:
                newData.append(item)
                # Collect colors for average (ignore very light or very dark pixels to catch the main red)
                if item[3] > 0: # not transparent
                    r_total += item[0]
                    g_total += item[1]
                    b_total += item[2]
                    count += 1

        img.putdata(newData)
        img.save(output_path, "PNG")

        if count > 0:
            avg_r = int(r_total / count)
            avg_g = int(g_total / count)
            avg_b = int(b_total / count)
            hex_color = '#{:02x}{:02x}{:02x}'.format(avg_r, avg_g, avg_b)
            print(f"Dominant Color: {hex_color}")
        else:
            print("Dominant Color: #B91C1C") # Fallback

    except Exception as e:
        print(f"Error: {e}")
        print("Dominant Color: #B91C1C") # Fallback

if __name__ == "__main__":
    analyze_and_process_logo()
