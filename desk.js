(() => {
    const dialog = document.querySelector('#portfolio-window');
    const content = document.querySelector('#window-content');
    const title = document.querySelector('#window-title');
    const source = document.querySelector('#window-source');
    const scroller = dialog.querySelector('.window-scroll');
    const pages = {
        about: {title: 'A little about me', path: 'portfolio.html', selectors: '#aboutMe, #education, #patents, #activities'},
        experience: {title: 'Experience', path: 'portfolio.html#experience', selectors: '#experience'},
        projects: {title: 'Things I have built', path: 'projects.html', selectors: 'body > section'},
        hardware: {title: 'Hardware & systems', path: 'projects.html#hardware', selectors: '#simd, #hardware, #guitar, #led'},
        life: {title: 'Outside of code', path: 'life.html', selectors: '#life'},
        littlethings: {title: 'Little things', path: 'life.html#littleThings', selectors: '#littleThings'},
        studentlife: {title: 'Student life', path: 'portfolio.html#education', selectors: '#education, #activities'},
        flights: {title: 'Window seat pics', path: 'gallery.html#flights', selectors: '#flights'},
        madison: {title: 'Madison', path: 'gallery.html#madison', selectors: '#madison'},
        swimming: {title: 'A freezing swim', path: 'gallery.html#lakeSwim', selectors: '#lakeSwim'},
        aurora: {title: 'Northern lights', path: 'gallery.html#aurora', selectors: '#aurora'},
        eclipse: {title: 'The eclipse', path: 'gallery.html#eclipse', selectors: '#eclipse'},
        sanfrancisco: {title: 'San Francisco on the Fourth', path: 'gallery.html#sanFrancisco', selectors: '#sanFrancisco'},
        gallery: {title: 'Photo gallery', path: 'gallery.html', selectors: 'body > section'},
        skating: {title: 'Ice skating', path: 'hockey.html', selectors: 'body > section'},
        contact: {title: 'Say hello', path: 'mailto:apyadav@wisc.edu', template: 'contact-content'}
    };
    const pageVersion = '6';
    const cache = new Map();
    let requestNumber = 0;
    let lastTrigger = null;

    async function loadPage(path) {
        const url = path.split('#')[0];
        if (!cache.has(url)) {
            cache.set(url, fetch(`${url}?v=${pageVersion}`).then(response => {
                if (!response.ok) throw new Error('Could not load this page.');
                return response.text();
            }).then(html => new DOMParser().parseFromString(html, 'text/html')).catch(error => {
                cache.delete(url);
                throw error;
            }));
        }
        return cache.get(url);
    }

    async function openSection(key, trigger, updateHistory = true) {
        const page = pages[key];
        if (!page) return;
        const thisRequest = ++requestNumber;
        if (!dialog.open) {
            lastTrigger = trigger || document.activeElement;
            dialog.showModal();
        }
        document.documentElement.classList.add('modal-open');
        title.textContent = page.title;
        source.href = page.path;
        source.textContent = key === 'contact' ? 'Send me an email ↗' : 'Open this page on its own ↗';
        dialog.querySelectorAll('.window-nav [data-open]').forEach(button => {
            if (button.dataset.open === key || (key === 'hardware' && button.dataset.open === 'projects') || (['littlethings', 'gallery', 'skating', 'flights', 'madison', 'swimming', 'aurora', 'eclipse', 'sanfrancisco'].includes(key) && button.dataset.open === 'life') || (key === 'studentlife' && button.dataset.open === 'about')) button.setAttribute('aria-current', 'page');
            else button.removeAttribute('aria-current');
        });
        content.querySelectorAll('video').forEach(video => video.pause());
        content.setAttribute('aria-busy', 'true');
        content.innerHTML = '<p class="loading-message">Opening the notebook…</p>';
        scroller.scrollTop = 0;
        if (updateHistory && location.hash !== `#${key}`) history.pushState(null, '', `#${key}`);
        try {
            let fragment;
            if (page.template) fragment = document.getElementById(page.template).content.cloneNode(true);
            else {
                const doc = await loadPage(page.path);
                fragment = document.createDocumentFragment();
                const sections = doc.querySelectorAll(page.selectors);
                if (!sections.length) throw new Error('No content was found.');
                sections.forEach(section => fragment.append(section.cloneNode(true)));
            }
            if (thisRequest !== requestNumber) return;
            content.replaceChildren(fragment);
            window.initPortfolioMedia(content);
        } catch (error) {
            if (thisRequest !== requestNumber) return;
            content.innerHTML = '<p>This page is taking a little longer to open. Use the link below to read it on its own.</p>';
        } finally {
            if (thisRequest === requestNumber) content.removeAttribute('aria-busy');
        }
    }

    document.addEventListener('click', event => {
        const trigger = event.target.closest('[data-open]');
        if (!trigger || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        openSection(trigger.dataset.open, trigger);
    });
    dialog.querySelector('.window-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
        const rect = dialog.getBoundingClientRect();
        if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
    });
    dialog.addEventListener('close', () => {
        ++requestNumber;
        content.querySelectorAll('video').forEach(video => video.pause());
        document.documentElement.classList.toggle('modal-open', !!document.querySelector('dialog[open]'));
        if (pages[location.hash.slice(1)]) history.replaceState(null, '', `${location.pathname}${location.search}`);
        if (lastTrigger?.isConnected) lastTrigger.focus({preventScroll: true});
    });
    function followLocation() {
        const key = location.hash.slice(1);
        if (pages[key]) openSection(key, null, false);
        else if (dialog.open) dialog.close();
    }
    window.addEventListener('popstate', followLocation);
    window.addEventListener('hashchange', followLocation);
    followLocation();
})();
