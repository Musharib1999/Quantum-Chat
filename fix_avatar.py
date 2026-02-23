from PIL import Image

def fix_avatar():
    img = Image.open('public/avatar.png').convert("RGBA")
    pixels = img.load()
    width, height = img.size

    # The image has a thick black border and a white background.
    # We want to crop out the black border and maybe make the white background transparent.
    # First, let's find the bounding box of the logo itself by finding non-white, non-black pixels?
    # Actually, the logo has black and blue parts. 
    # Let's just crop to where the white background begins inside the black border.
    
    # scan for the first row that has a lot of white pixels
    top = 0
    while top < height / 2:
        white_count = sum(1 for x in range(width) if sum(pixels[x, top][:3]) > 700)
        if white_count > width * 0.5:
            break
        top += 1
        
    bottom = height - 1
    while bottom > height / 2:
        white_count = sum(1 for x in range(width) if sum(pixels[x, bottom][:3]) > 700)
        if white_count > width * 0.5:
            break
        bottom -= 1
        
    left = 0
    while left < width / 2:
        white_count = sum(1 for y in range(height) if sum(pixels[left, y][:3]) > 700)
        if white_count > height * 0.5:
            break
        left += 1

    right = width - 1
    while right > width / 2:
        white_count = sum(1 for y in range(height) if sum(pixels[right, y][:3]) > 700)
        if white_count > height * 0.5:
            break
        right -= 1

    # Crop with a slight inset to remove any anti-aliased black border remains
    inset = 10
    crop_box = (left + inset, top + inset, right - inset, bottom - inset)
    print(f"Cropping to: {crop_box}")
    img_cropped = img.crop(crop_box)
    
    # Make white transparent
    cropped_pixels = img_cropped.load()
    cw, ch = img_cropped.size
    for x in range(cw):
        for y in range(ch):
            r, g, b, a = cropped_pixels[x, y]
            if r > 240 and g > 240 and b > 240:
                cropped_pixels[x, y] = (255, 255, 255, 0)
                
    img_cropped.save('public/avatar.png')
    print("Fixed avatar.png")

if __name__ == "__main__":
    fix_avatar()
