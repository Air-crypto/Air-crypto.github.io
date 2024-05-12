function expandImage(img) {
    if (img.classList.contains('expanded')) {
        img.classList.remove('expanded');
    } else {
        const expandedImages = document.querySelectorAll('.expanded');
        for (let expanded of expandedImages) {
            expanded.classList.remove('expanded');
        }
        img.classList.add('expanded');
    }
}