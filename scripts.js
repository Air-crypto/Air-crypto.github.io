class ImageExpander {
    static currentlyExpanded = null; // Shared across all instances

    constructor(containerSelector) {
        this.containers = document.querySelectorAll(containerSelector);
        this.initEvents();
    }

    initEvents() {
        // Apply event listeners to each container
        this.containers.forEach(container => {
            container.addEventListener('click', event => {
                const target = event.target;
                if (target.tagName === 'IMG') {
                    if (target === ImageExpander.currentlyExpanded) {
                        this.closeExpandedImages(); // Minimize if the same image is clicked
                    } else {
                        this.expandImage(target); // Expand new image
                    }
                    event.stopPropagation(); // Prevent the event from bubbling to document
                }
            });
        });

        // Global click listener to close expanded images
        document.addEventListener('click', () => {
            this.closeExpandedImages();
        });
    }

    expandImage(img) {
        // Close any previously expanded images
        this.closeExpandedImages();

        // Add 'expanded' class to clicked image and set it as currently expanded globally
        img.classList.add('expanded');
        ImageExpander.currentlyExpanded = img;
    }

    closeExpandedImages() {
        // If an image is expanded, remove the class and reset the currently expanded image
        if (ImageExpander.currentlyExpanded) {
            ImageExpander.currentlyExpanded.classList.remove('expanded');
            ImageExpander.currentlyExpanded = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ImageExpander('.gallery-container');
});
