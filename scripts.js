// Native dialogs keep enlarged media usable with a keyboard as well as a mouse.
(() => {
    const viewer = document.createElement('dialog');
    viewer.className = 'media-viewer';
    viewer.setAttribute('aria-label', 'Enlarged photo or video');
    viewer.innerHTML = '<button type="button" class="media-close" aria-label="Close enlarged media">×</button><div class="media-content"></div>';
    document.body.append(viewer);
    const content = viewer.querySelector('.media-content');
    const syncScroll = () => document.documentElement.classList.toggle('modal-open', !!document.querySelector('dialog[open]'));

    function openMedia(source) {
        const media = source.cloneNode(true);
        media.removeAttribute('tabindex');
        media.removeAttribute('role');
        media.removeAttribute('aria-label');
        media.removeAttribute('loading');
        // Grid images are small copies. Show the copy at full size, then swap in the original.
        if (media.dataset.full) {
            if (source.naturalWidth) {
                const scale = Math.min(innerWidth * .9 / source.naturalWidth, innerHeight * .84 / source.naturalHeight);
                media.style.width = `${Math.round(source.naturalWidth * scale)}px`;
            }
            const full = new Image();
            full.onload = () => { if (media.isConnected) media.src = full.src; };
            full.src = media.dataset.full;
        }
        if (media.tagName === 'VIDEO') {
            media.controls = true;
            media.preload = 'auto';
            media.muted = true;
            media.playsInline = true;
        }
        content.replaceChildren(media);
        viewer.showModal();
        viewer.focus({preventScroll: true});
        syncScroll();
        if (media.tagName === 'VIDEO') media.play().catch(() => {});
    }

    window.initPortfolioMedia = (root = document) => {
        root.querySelectorAll('.gallery-container img').forEach(image => {
            image.tabIndex = 0;
            image.setAttribute('role', 'button');
            image.setAttribute('aria-label', `Enlarge ${image.alt || 'photo'}`);
        });
        root.querySelectorAll('.gallery-container video').forEach(video => {
            if (video.parentElement.classList.contains('media-item')) return;
            const wrap = document.createElement('div');
            wrap.className = 'media-item';
            video.before(wrap);
            wrap.append(video);
            const expand = document.createElement('button');
            expand.type = 'button';
            expand.className = 'media-expand';
            expand.textContent = 'Expand video ↗';
            expand.setAttribute('aria-label', 'Expand video in a larger player');
            wrap.append(expand);
        });
    };

    document.addEventListener('click', event => {
        const image = event.target.closest('.gallery-container img');
        const expand = event.target.closest('.media-expand');
        if (image) openMedia(image);
        if (expand) openMedia(expand.parentElement.querySelector('video'));
    });
    document.addEventListener('keydown', event => {
        if (event.target.matches('.gallery-container img') && ['Enter', ' '].includes(event.key)) {
            event.preventDefault();
            openMedia(event.target);
        }
    });
    viewer.querySelector('.media-close').addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', event => {
        const rect = viewer.getBoundingClientRect();
        if (event.target === viewer && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) viewer.close();
    });
    viewer.addEventListener('close', () => {
        content.querySelector('video')?.pause();
        content.replaceChildren();
        syncScroll();
    });
    window.initPortfolioMedia();
})();
