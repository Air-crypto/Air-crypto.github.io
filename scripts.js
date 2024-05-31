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
                if (target.tagName === 'IMG') {
                    if (target === MediaManager.currentlyActive) {
                        this.closeMedia(); // Minimize if the same media is clicked
                    } else {
                        this.expandMedia(target); // Expand new media
                    }
                    event.stopPropagation(); 
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
        MediaManager.currentlyActive = media;
    }

    closeMedia() {
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
    new MediaManager('.gallery-container'); 
});
