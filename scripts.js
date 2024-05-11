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