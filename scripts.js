class MediaManager {
    static currentlyActive = null; // Shared across all instances

    constructor(containerSelector) {
        this.containers = document.querySelectorAll(containerSelector);
        this.initEvents();
    }

    initEvents() {
        this.containers.forEach(container => {
            container.addEventListener('click', event => {
                const target = event.target;
                if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
                    if (target === MediaManager.currentlyActive) {
                        this.closeMedia(); // Minimize if the same media is clicked
                    } else {
                        this.expandMedia(target); // Expand new media
                    }
                    event.stopPropagation(); // Prevent the event from bubbling to document
                }
            });
        });

        // Global click listener to close expanded images or pause videos
        document.addEventListener('click', () => {
            this.closeMedia();
        });
    }

    expandMedia(media) {
        // Close any previously active media
        this.closeMedia();

        // Add 'expanded' class to clicked media and set it as currently active globally
        media.classList.add('expanded');
        if (media.tagName === 'VIDEO') {
            media.play(); // Autoplay when expanded
        }
        MediaManager.currentlyActive = media;
    }

    closeMedia() {
        // If media is active, remove the class and reset the currently active media
        if (MediaManager.currentlyActive) {
            if (MediaManager.currentlyActive.tagName === 'VIDEO' && !MediaManager.currentlyActive.paused) {
                MediaManager.currentlyActive.pause();
            }
            MediaManager.currentlyActive.classList.remove('expanded');
            MediaManager.currentlyActive = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MediaManager('.gallery-container'); // Assume video and images are in the same container
});
