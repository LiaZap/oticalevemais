from PIL import Image
import numpy as np

def analyze_and_process_logo():
    input_path = 'src/assets/logo.png'
    output_path = 'src/assets/logo_transparent.png'

    try:
        img = Image.open(input_path).convert("RGBA")
        datas = img.getdata()

        newData = []
        reds = []
        greens = []
        blues = []

        for item in datas:
            # Check for white (allow some tolerance)
            if item[0] > 200 and item[1] > 200 and item[2] > 200:
                newData.append((255, 255, 255, 0)) # Make transparent
            else:
                newData.append(item)
                # Collect colors for average (ignore very light or very dark pixels to catch the main red)
                if item[3] > 0: # not transparent
                    reds.append(item[0])
                    greens.append(item[1])
                    blues.append(item[2])

        img.putdata(newData)
        img.save(output_path, "PNG")

        if reds:
            avg_r = int(np.mean(reds))
            avg_g = int(np.mean(greens))
            avg_b = int(np.mean(blues))
            hex_color = '#{:02x}{:02x}{:02x}'.format(avg_r, avg_g, avg_b)
            print(f"Dominant Color: {hex_color}")
        else:
            print("Dominant Color: #B91C1C") # Fallback to red-700

    except Exception as e:
        print(f"Error: {e}")
        print("Dominant Color: #B91C1C") # Fallback

if __name__ == "__main__":
    analyze_and_process_logo()
