from PIL import Image

def fix_avatar_precise():
    # Load original image (assuming it was git checkout 'd or we have to revert it if it's messed up. Let's just git checkout the original first)
    pass

if __name__ == "__main__":
    import os
    os.system('git checkout public/avatar.png')
    
    img = Image.open('public/avatar.png').convert("RGBA")
    pixels = img.load()
    width, height = img.size

    # The QG logo is composed of blue (#345BAF approx) and black/dark grey (#232323 approx).
    # White is #FFFFFF. The border is black.
    # We want to find the bounding box of the central logo.
    # Since the border is on the outside, we can just search from the center outwards!
    
    cx, cy = width // 2, height // 2
    
    # We'll just define the logo color as anything that is NOT white and NOT transparent.
    # WAIT! The border is also not white.
    # Instead, we find the first non-white pixel coming from the center to the left, right, top, bottom.
    
    # Actually, a simple approach: The border is at the edges. We can find the border, then skip the white gap, and find the logo.
    # OR we can just find any non-white pixel in the middle 50% of the image.
    
    min_x, max_x = width, 0
    min_y, max_y = height, 0
    
    for y in range(height):
        # Only check the middle 60% of the width to avoid the left/right borders
        for x in range(int(width*0.2), int(width*0.8)):
            r, g, b, a = pixels[x, y]
            # If not white and not transparent
            if a > 0 and (r < 240 or g < 240 or b < 240):
                # Also to prevent catching the top/bottom borders, let's only count it if it's not a huge horizontal line
                if y > height*0.2 and y < height*0.8:
                    if x < min_x: min_x = x
                    if x > max_x: max_x = x
                    if y < min_y: min_y = y
                    if y > max_y: max_y = y

    pad = 20
    crop_box = (max(0, min_x-pad), max(0, min_y-pad), min(width, max_x+pad), min(height, max_y+pad))
    print(f"Cropping exact to: {crop_box}")
    img_cropped = img.crop(crop_box)
    
    # make white transparent
    cropped_pixels = img_cropped.load()
    cw, ch = img_cropped.size
    for x in range(cw):
        for y in range(ch):
            r, g, b, a = cropped_pixels[x, y]
            if r > 240 and g > 240 and b > 240:
                cropped_pixels[x, y] = (255, 255, 255, 0)

    img_cropped.save('public/avatar.png')
    print("Fixed avatar.png exactly")

fix_avatar_precise()
