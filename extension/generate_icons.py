#!/usr/bin/env python3
"""
Generate icons for CSS Class Finder extension
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_icon(size, output_path):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Colors matching extension theme
    bg_color1 = (102, 126, 234)  # #667eea
    bg_color2 = (118, 75, 162)   # #764ba2

    # Create gradient background circle
    for i in range(size):
        for j in range(size):
            # Calculate distance from center
            dx = i - size/2
            dy = j - size/2
            distance = (dx*dx + dy*dy) ** 0.5

            # Draw circle with gradient
            if distance < size/2 - 2:
                # Gradient from top to bottom
                t = j / size
                r = int(bg_color1[0] * (1-t) + bg_color2[0] * t)
                g = int(bg_color1[1] * (1-t) + bg_color2[1] * t)
                b = int(bg_color1[2] * (1-t) + bg_color2[2] * t)
                img.putpixel((i, j), (r, g, b, 255))

    # Draw white magnifying glass
    padding = size * 0.2

    # Magnifying glass circle
    circle_center_x = size * 0.4
    circle_center_y = size * 0.4
    circle_radius = size * 0.25

    # Draw circle (lens)
    draw.ellipse([
        circle_center_x - circle_radius,
        circle_center_y - circle_radius,
        circle_center_x + circle_radius,
        circle_center_y + circle_radius
    ], outline='white', width=max(2, size // 20))

    # Draw handle
    handle_length = size * 0.3
    handle_width = max(2, size // 20)

    # Calculate handle position (diagonal from bottom-right of circle)
    angle = 45  # degrees
    import math
    rad = math.radians(angle)

    handle_start_x = circle_center_x + circle_radius * math.cos(rad)
    handle_start_y = circle_center_y + circle_radius * math.sin(rad)
    handle_end_x = handle_start_x + handle_length * math.cos(rad)
    handle_end_y = handle_start_y + handle_length * math.sin(rad)

    draw.line([
        (handle_start_x, handle_start_y),
        (handle_end_x, handle_end_y)
    ], fill='white', width=handle_width)

    # Draw CSS dot inside magnifying glass (small green and red dots)
    dot_size = circle_radius * 0.4

    # Green dot (content)
    green_x = circle_center_x - dot_size * 0.6
    green_y = circle_center_y
    draw.ellipse([
        green_x - dot_size/2,
        green_y - dot_size/2,
        green_x + dot_size/2,
        green_y + dot_size/2
    ], fill='#4CAF50')

    # Red dot (ignore)
    red_x = circle_center_x + dot_size * 0.6
    red_y = circle_center_y
    draw.ellipse([
        red_x - dot_size/2,
        red_y - dot_size/2,
        red_x + dot_size/2,
        red_y + dot_size/2
    ], fill='#f44336')

    # Save
    img.save(output_path, 'PNG')
    print(f'✓ Created {output_path} ({size}x{size})')

# Generate all sizes
script_dir = os.path.dirname(os.path.abspath(__file__))

create_icon(16, os.path.join(script_dir, 'icon16.png'))
create_icon(48, os.path.join(script_dir, 'icon48.png'))
create_icon(128, os.path.join(script_dir, 'icon128.png'))

print('\n🎨 All icons generated successfully!')
