<script>
function expandImage(img) {
    // Check if the image is already expanded
    if (img.classList.contains('expanded')) {
        img.classList.remove('expanded'); // Click again to minimize
    } else {
        // Minimize any currently expanded image
        const expandedImages = document.querySelectorAll('.expanded');
        for (let expanded of expandedImages) {
            expanded.classList.remove('expanded');
        }
        // Expand the clicked image
        img.classList.add('expanded');
    }
}
</script>