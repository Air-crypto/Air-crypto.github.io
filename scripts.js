class ImageExpander {
    constructor(containerElement) {
        this.container = containerElement;
        this.initEvents();
    }

    initEvents() {
        // Event listener for images within the container
        this.container.addEventListener('click', event => {
            const target = event.target;
            if (target.tagName === 'IMG') {
                if (target === this.currentlyExpanded) {
                    this.closeExpandedImages(); // Minimize if the same image is clicked
                } else {
                    this.expandImage(target); // Expand new image
                }
                event.stopPropagation(); // Prevent the event from bubbling to document
            }
        });

        // Event listener for clicks on the document to close expanded images
        document.addEventListener('click', event => {
            this.closeExpandedImages();
        });
    }

    expandImage(img) {
        // First close any previously expanded images
        this.closeExpandedImages();

        // Add 'expanded' class to clicked image if it's not already expanded
        if (!img.classList.contains('expanded')) {
            img.classList.add('expanded');
        }
    }

    closeExpandedImages() {
        // Remove 'expanded' class from all images
        const expandedImages = this.container.querySelectorAll('.expanded');
        expandedImages.forEach(img => {
            img.classList.remove('expanded');
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const galleries = document.querySelectorAll('.gallery-container');
    galleries.forEach(gallery => {
        new ImageExpander(gallery);
    });
});
