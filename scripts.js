function expandImage(img) {
    // Remove any previously expanded images
    document.querySelectorAll('.expanded').forEach(el => el.classList.remove('expanded'));

    // Add 'expanded' class to clicked image
    img.classList.add('expanded');

    // Check if the image is too small and scale it up
    if (img.naturalWidth < window.innerWidth * 0.5 || img.naturalHeight < window.innerHeight * 0.5) {
        img.style.width = img.naturalWidth * 2 + 'px';  // Scale up by double
        img.style.height = img.naturalHeight * 2 + 'px';  // Maintain aspect ratio
    }
}