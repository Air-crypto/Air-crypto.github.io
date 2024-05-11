// Function to open a modal with the image source set to the clicked image
function openModal(src) {
    var modal = document.getElementById('lightbox-modal');
    var modalImg = document.getElementById('lightbox-image');
    modal.style.display = 'flex';
    modalImg.src = src;
}

// Function to close the modal
function closeModal() {
    var modal = document.getElementById('lightbox-modal');
    modal.style.display = 'none';
}

// Function to toggle the display of timeline event details
function toggleTimelineDetail(eventId) {
    var content = document.getElementById(eventId);
    if (content.style.display === 'block') {
        content.style.display = 'none';
    } else {
        content.style.display = 'block';
    }
}

