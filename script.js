document.addEventListener('DOMContentLoaded', () => {
    // --- DATABASE INITIALIZATION ---
    const DB_KEY = 'jbcuriosoplusDB';
    const WATCHED_DB_KEY = 'jbcuriosoplusWatchedDB';

    const defaultData = {
        movies: [
            { id: "mov1", title: "Big Buck Bunny", subtitle: "Animação de código aberto", cover: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big_Buck_Bunny_posteri_big.jpg/800px-Big_Buck_Bunny_posteri_big.jpg", url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" },
            { id: "mov2", title: "Elephants Dream", subtitle: "O primeiro filme aberto", cover: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Elephants_Dream_s5_-_10.jpg/800px-Elephants_Dream_s5_-_10.jpg", url: "http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4" }
        ],
        videos: [
            { id: "vid1", title: "Aprenda HTML em 5 minutos", subtitle: "JB Curioso", cover: "https://i.ytimg.com/vi/3sL0omw_y_4/hqdefault.jpg", url: "https://www.youtube.com/watch?v=3sL0omw_y_4" },
            { id: "vid2", title: "CSS para iniciantes", subtitle: "JB Curioso", cover: "https://i.ytimg.com/vi/I-D2hVfA47w/hqdefault.jpg", url: "https://www.youtube.com/watch?v=I-D2hVfA47w" }
        ],
        series: [
            {
                id: "ser1", title: "Curso de JavaScript", subtitle: "Do zero ao avançado", cover: "https://i.ytimg.com/vi/Ptbk2af68e8/hqdefault.jpg",
                seasons: [
                    {
                        season: 1,
                        episodes: [
                            { id: "ep1-1", title: "Episódio 1: Variáveis", cover: "https://i.ytimg.com/vi/Ptbk2af68e8/hqdefault.jpg", url: "https://www.youtube.com/watch?v=Ptbk2af68e8" },
                            { id: "ep1-2", title: "Episódio 2: Funções", cover: "https://i.ytimg.com/vi/Ptbk2af68e8/hqdefault.jpg", url: "https://www.youtube.com/watch?v=Ptbk2af68e8" }
                        ]
                    }
                ]
            }
        ]
    };

    let db = JSON.parse(localStorage.getItem(DB_KEY)) || JSON.parse(JSON.stringify(defaultData));
    let watchedDb = JSON.parse(localStorage.getItem(WATCHED_DB_KEY)) || [];
    let isManageMode = false;
    let isAdminAuthenticated = false; // No longer using sessionStorage

    function saveDB() {
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }

    function saveWatchedDB() {
        localStorage.setItem(WATCHED_DB_KEY, JSON.stringify(watchedDb));
    }

    function markAsWatched(id, type) {
        if (!watchedDb.some(item => item.id === id && item.type === type)) {
            watchedDb.push({ id, type });
            saveWatchedDB();
        }
    }

    // --- UI ELEMENTS ---
    const mainContent = document.getElementById('main-content');
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.nav-link');
    const menuToggle = document.getElementById('menu-toggle');
    const closeMenu = document.getElementById('close-menu');
    const sidebar = document.getElementById('sidebar');
    const videoPlayerModal = document.getElementById('video-player-modal');
    const playerContainer = document.getElementById('player-container');
    const closeModalBtn = document.querySelector('.close-modal');
    const playerTitle = document.getElementById('player-title');
    const playerDescription = document.getElementById('player-description');

    // --- NAVIGATION AND ROUTING ---
    function navigateTo(hash) {
        if (!hash) hash = '#home';

        const hashParts = hash.split('?');
        const pageId = hashParts[0];

        const targetPage = document.querySelector(pageId);
        const targetLink = document.querySelector(`.nav-link[href="${pageId}"]`);

        pages.forEach(p => p.classList.remove('active'));

        // Handle special page rendering
        if (pageId === '#series-detail') {
            const seriesId = new URLSearchParams(hashParts[1]).get('id');
            renderSeriesDetailPage(seriesId);
            document.getElementById('series-detail').classList.add('active');
        } else {
             if (targetPage) {
                targetPage.classList.add('active');
            } else {
                // Fallback for old player page hash
                document.querySelector('#home').classList.add('active');
            }
        }

        if (pageId === '#watched') {
            renderWatchedPage();
        }

        navLinks.forEach(link => link.classList.remove('active'));
        if (targetLink) targetLink.classList.add('active');
        
        // Handle admin page logic
        const isAdminPage = pageId === '#admin';
        if (isAdminPage) {
            handleAdminAccess();
        } else {
            // Reset admin state when leaving the page
            isAdminAuthenticated = false; 
            if(document.getElementById('admin-login-container')) {
                 document.getElementById('admin-login-container').style.display = 'block';
                 document.getElementById('admin-content-container').style.display = 'none';
                 if(document.getElementById('admin-password')) document.getElementById('admin-password').value = '';
            }
        }

        if (sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
        }
        window.scrollTo(0, 0);
    }

    // --- RENDERING FUNCTIONS ---
    function createVideoCard(item, type, seriesInfo = null) {
        const card = document.createElement('div');
        card.className = 'video-card';
        card.dataset.id = item.id;
        card.dataset.type = type;
        if (isManageMode) {
            card.classList.add('manage-mode');
        }
        if (watchedDb.some(w => w.id === item.id)) {
            card.classList.add('watched');
        }

        let cardSubtitle = item.subtitle || '';
        if (type === 'episode' && seriesInfo) {
            cardSubtitle = `${seriesInfo.title} - T${seriesInfo.season}`;
        }

        card.innerHTML = `
            <img src="${item.cover}" alt="${item.title}" class="card-img">
            <div class="card-body">
                <h4 class="card-title">${item.title}</h4>
                <p class="card-subtitle">${cardSubtitle}</p>
            </div>
            <button class="remove-btn" style="display:none;">&times;</button> 
        `;

        card.addEventListener('click', (e) => {
             if (e.target.classList.contains('remove-btn')) return; // Prevent navigation when clicking remove
             if (isManageMode) return; // Prevent navigation in manage mode
             if (type === 'series') {
                window.location.hash = `#series-detail?id=${item.id}`;
            } else {
                openPlayer(type, item.id);
            }
        });
        
        card.querySelector('.remove-btn').addEventListener('click', (e) => {
             e.stopPropagation(); // Prevent the card click event from firing
             if (confirm(`Tem certeza que deseja remover "${item.title}"?`)) {
                if (type === 'episode') {
                    const seriesId = card.dataset.seriesId;
                    const seasonNumber = card.dataset.seasonNumber;
                    removeEpisode(seriesId, seasonNumber, item.id);
                } else {
                    removeItem(item.id, type + 's'); // Ensure plural for db key ('movies', 'videos', 'series')
                }
            }
        });

        return card;
    }
    
    function renderAll() {
        const moviesGrid = document.getElementById('movies-grid');
        const videosGrid = document.getElementById('videos-grid');
        const seriesGrid = document.getElementById('series-grid');
        const homeMovies = document.getElementById('home-movies');
        const homeVideos = document.getElementById('home-videos');

        moviesGrid.innerHTML = '';
        videosGrid.innerHTML = '';
        seriesGrid.innerHTML = '';
        homeMovies.innerHTML = '';
        homeVideos.innerHTML = '';
        
        db.movies.forEach(item => moviesGrid.appendChild(createVideoCard(item, 'movies')));
        db.videos.forEach(item => videosGrid.appendChild(createVideoCard(item, 'videos')));
        db.series.forEach(item => seriesGrid.appendChild(createVideoCard(item, 'series')));

        // Populate home page (e.g., first 4 of each)
        db.movies.slice(0, 4).forEach(item => homeMovies.appendChild(createVideoCard(item, 'movies')));
        db.videos.slice(0, 4).forEach(item => homeVideos.appendChild(createVideoCard(item, 'videos')));
        
        updateAdminSeriesList();
        renderDeleteList();

        // Don't auto-navigate here, initial load will do it.
        if (window.location.hash && window.location.hash !== '#player-page') {
            navigateTo(window.location.hash);
        } else {
            navigateTo('#home');
        }
    }
    
    function renderSeriesDetailPage(seriesId) {
        const series = db.series.find(s => s.id === seriesId);
        if (!series) {
            window.location.hash = '#series';
            return;
        }

        // Header
        document.getElementById('series-detail-title').textContent = series.title;
        document.getElementById('series-detail-subtitle').textContent = series.subtitle;
        document.getElementById('series-detail-cover').src = series.cover;
        
        const seasonsTabsContainer = document.getElementById('seasons-tabs-container');
        const episodesGrid = document.getElementById('episodes-grid');
        seasonsTabsContainer.innerHTML = '';
        episodesGrid.innerHTML = '';

        if (!series.seasons || series.seasons.length === 0) {
            episodesGrid.innerHTML = `<p>Nenhum episódio encontrado para esta série.</p>`;
            document.querySelector('#series-detail .back-button').onclick = () => window.history.back();
            return;
        }

        // Sort seasons numerically
        series.seasons.sort((a, b) => a.season - b.season);

        // State to keep track of the active season
        let activeSeasonNumber = series.seasons[0].season;

        function renderEpisodesForSeason(seasonNumber) {
            activeSeasonNumber = seasonNumber;
            const seasonData = series.seasons.find(s => s.season === seasonNumber);
            episodesGrid.innerHTML = '';

            if (seasonData && seasonData.episodes) {
                 seasonData.episodes.forEach(ep => {
                    const card = createVideoCard(ep, 'episode');
                    // Add extra data for removal
                    card.dataset.seriesId = series.id;
                    card.dataset.seasonNumber = seasonNumber;
                    // Make remove button work for episodes from the grid
                    const removeBtn = card.querySelector('.remove-btn');
                    removeBtn.style.display = isManageMode ? 'flex' : 'none';
                    removeBtn.dataset.id = ep.id;
                    removeBtn.dataset.type = 'episode';

                    episodesGrid.appendChild(card);
                });
            } else {
                episodesGrid.innerHTML = `<p>Nenhum episódio para esta temporada.</p>`;
            }

            // Update active tab style
            document.querySelectorAll('.season-tab').forEach(tab => {
                tab.classList.toggle('active', parseInt(tab.dataset.season) === seasonNumber);
            });
             // Re-check manage mode on elements
            document.querySelectorAll('.video-card').forEach(el => el.classList.toggle('manage-mode', isManageMode));
            document.querySelectorAll('.video-card .remove-btn').forEach(btn => btn.style.display = isManageMode ? 'flex' : 'none');
        }

        series.seasons.forEach(season => {
            const tab = document.createElement('button');
            tab.className = 'season-tab';
            tab.textContent = `Temporada ${season.season}`;
            tab.dataset.season = season.season;
            tab.onclick = () => renderEpisodesForSeason(season.season);
            seasonsTabsContainer.appendChild(tab);
        });

        // Initial render of the first season
        renderEpisodesForSeason(activeSeasonNumber);

        document.querySelector('#series-detail .back-button').onclick = () => window.history.back();
    }

    function renderWatchedPage() {
        const watchedGrid = document.getElementById('watched-grid');
        watchedGrid.innerHTML = '';

        if (watchedDb.length === 0) {
            watchedGrid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; color: var(--text-muted);">Você ainda não assistiu a nenhum conteúdo.</p>`;
            return;
        }

        // Iterate backwards to show most recently watched first
        for (let i = watchedDb.length - 1; i >= 0; i--) {
            const watchedItem = watchedDb[i];
            let itemData;
            let cardType;
            let seriesInfo = null;

            const contentLocation = findContentById(watchedItem.id);
            
            if(contentLocation) {
                itemData = contentLocation.item;
                cardType = contentLocation.type;

                if (cardType === 'episode') {
                    seriesInfo = { title: contentLocation.series.title, season: contentLocation.season.season };
                }

                 if (itemData) {
                    const card = createVideoCard(itemData, cardType, seriesInfo);
                    card.classList.add('watched');
                    watchedGrid.appendChild(card);
                }
            }
        }
    }

    // --- VIDEO PLAYER ---
    function openPlayer(type, id) {
        playerContainer.innerHTML = '';
        playerTitle.textContent = '';
        playerDescription.textContent = '';
        
        const contentLocation = findContentById(id);
        if (!contentLocation) {
            playerTitle.textContent = 'Conteúdo não encontrado.';
            videoPlayerModal.style.display = 'block';
            return;
        }

        const { item, url } = contentLocation;
        playerTitle.textContent = item.title;
        playerDescription.textContent = item.subtitle || '';

        markAsWatched(item.id, type); // Use item.id and type for consistency
        // Immediately update the card to show it's watched
        const card = document.querySelector(`.video-card[data-id="${item.id}"]`);
        if (card) {
            card.classList.add('watched');
        }

        if (typeof url === 'string' && url.trim().startsWith('<iframe')) {
            playerContainer.innerHTML = url;
            const iframe = playerContainer.querySelector('iframe');
            if(iframe) {
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                // Attempt to add autoplay
                const src = iframe.getAttribute('src');
                if (src && !src.includes('autoplay=1')) {
                    iframe.setAttribute('src', src + (src.includes('?') ? '&' : '?') + 'autoplay=1');
                }
            }
        } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const videoId = url.split('v=')[1]?.split('&')[0] || url.split('/').pop();
            const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
            playerContainer.innerHTML = `<iframe src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        } else if (url.includes('dailymotion.com') || url.includes('dai.ly')) {
            const videoIdMatch = url.match(/(?:video|hub)\/([^?_]+)/);
            const videoId = videoIdMatch ? videoIdMatch[1] : url.split('/').pop();
            const embedUrl = `https://www.dailymotion.com/embed/video/${videoId}?autoplay=1`;
            playerContainer.innerHTML = `<iframe frameborder="0" type="text/html" src="${embedUrl}" width="100%" height="100%" allowfullscreen allow="autoplay"></iframe>`;
        } else if (url.includes('drive.google.com')) {
            const fileId = url.match(/d\/([a-zA-Z0-9_-]+)/)?.[1];
            if (fileId) {
                const embedUrl = `https://drive.google.com/file/d/${fileId}/preview`;
                playerContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="100%" allow="autoplay" frameborder="0"></iframe>`;
            } else {
                 playerContainer.innerHTML = `<p style="text-align:center; padding: 2rem;">Link do Google Drive inválido.</p>`;
            }
        } else {
             playerContainer.innerHTML = `<video src="${url}" controls autoplay></video>`;
        }
        
        videoPlayerModal.style.display = 'block';
    }

    function closePlayer() {
        playerContainer.innerHTML = '';
        videoPlayerModal.style.display = 'none';
    }

    // --- ADMIN / CMS ---
    const addForm = document.getElementById('add-content-form');
    const contentTypeSelect = document.getElementById('content-type');
    const seriesSelectionContainer = document.getElementById('series-selection-container');
    const seasonSelectionContainer = document.getElementById('season-selection-container');
    const urlInput = document.getElementById('content-url');
    const fileInput = document.getElementById('content-file');
    const fileInputLabel = document.querySelector('label[for="content-file"]');
    const fileStatus = document.getElementById('file-upload-status');
    const manageContentToggle = document.getElementById('manage-content-toggle');
    const adminLoginContainer = document.getElementById('admin-login-container');
    const adminContentContainer = document.getElementById('admin-content-container');
    const loginForm = document.getElementById('login-form');
    const passwordInput = document.getElementById('admin-password');
    const loginError = document.getElementById('login-error');

    function handleAdminAccess() {
        if (isAdminAuthenticated) {
            adminLoginContainer.style.display = 'none';
            adminContentContainer.style.display = 'block';
        } else {
            adminLoginContainer.style.display = 'block';
            adminContentContainer.style.display = 'none';
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (passwordInput.value === 'VIDAMILO') {
            isAdminAuthenticated = true;
            loginError.style.display = 'none';
            handleAdminAccess();
            renderDeleteList(); // Ensure list is rendered on successful login
        } else {
            loginError.style.display = 'block';
            passwordInput.value = '';
        }
    });

    function updateAdminSeriesList() {
        const seriesSelect = document.getElementById('existing-series');
        seriesSelect.innerHTML = db.series.map(s => `<option value="${s.id}">${s.title}</option>`).join('');
    }

    contentTypeSelect.addEventListener('change', () => {
        const type = contentTypeSelect.value;
        const isEpisode = type === 'episode';
        const isSeries = type === 'series';
        
        seriesSelectionContainer.style.display = isEpisode ? 'block' : 'none';
        seasonSelectionContainer.style.display = isEpisode ? 'block' : 'none';
        
        // Hide URL/File inputs for new series, show for others
        const shouldShowUrl = type !== 'series';
        urlInput.style.display = shouldShowUrl ? 'block' : 'none';
        urlInput.parentElement.querySelector('label[for="content-file"]').style.display = shouldShowUrl ? 'block' : 'none';
        
        if (isEpisode) {
            updateAdminSeriesList();
        }
    });
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const objectURL = URL.createObjectURL(file);
            urlInput.value = objectURL;
            urlInput.readOnly = true;
            fileStatus.textContent = `Arquivo selecionado: ${file.name}`;
            fileStatus.style.display = 'block';
        } else {
            urlInput.value = '';
            urlInput.readOnly = false;
            fileStatus.style.display = 'none';
        }
    });

    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = contentTypeSelect.value;
        const title = document.getElementById('content-title').value;
        const subtitle = document.getElementById('content-subtitle').value;
        const url = document.getElementById('content-url').value;
        const cover = document.getElementById('content-cover').value;

        // For series, URL is not required on creation
        if (type !== 'series' && (!url || !url.trim())) {
            alert('Por favor, forneça uma URL, código de incorporação ou envie um arquivo.');
            return;
        }

        const newItem = {
            id: `${type.slice(0,3)}${Date.now()}`,
            title,
            subtitle,
            cover
        };
        
        if (type === 'movie' || type === 'video') {
            newItem.url = url;
            const dbKey = type + 's'; // 'movies' or 'videos'
            db[dbKey].push(newItem);
        } else if (type === 'series') {
            newItem.seasons = [];
            db.series.push(newItem);
        } else if (type === 'episode') {
            const seriesId = document.getElementById('existing-series').value;
            const seasonNumber = parseInt(document.getElementById('season-number').value, 10);
            const series = db.series.find(s => s.id === seriesId);

            if (series && seasonNumber >= 1) {
                const newEpisode = { id: `ep${Date.now()}`, title, subtitle, url, cover };
                
                // Ensure seasons array exists
                if (!series.seasons) {
                    series.seasons = [];
                }

                // Find season or create it
                let season = series.seasons.find(s => s.season === seasonNumber);
                if (!season) {
                    season = { season: seasonNumber, episodes: [] };
                    series.seasons.push(season);
                }
                
                season.episodes.push(newEpisode);

            } else {
                alert('Série não encontrada ou número da temporada inválido!');
                return;
            }
        }
        
        saveDB();
        renderAll();
        addForm.reset();
        fileInput.value = ''; // Reset file input explicitly
        urlInput.readOnly = false;
        fileStatus.style.display = 'none';
        contentTypeSelect.dispatchEvent(new Event('change'));
        alert('Conteúdo adicionado com sucesso!');
        renderDeleteList(); // Refresh delete list after adding
    });

    function removeItem(id, type) {
        if (type === 'movies' || type === 'videos' || type === 'series') {
            db[type] = db[type].filter(item => item.id !== id);
        } else if (type === 'episode') {
            for (const series of db.series) {
                for (const season of series.seasons || []) {
                    const episodeIndex = season.episodes.findIndex(ep => ep.id === id);
                    if (episodeIndex > -1) {
                        season.episodes.splice(episodeIndex, 1);
                        break; // Exit inner loop
                    }
                }
            }
        }
        
        watchedDb = watchedDb.filter(w => w.id !== id);
        saveDB();
        saveWatchedDB();
        renderAll(); // Re-render everything to reflect the change
        renderDeleteList(); // Re-render the delete list
    }
    
    function renderDeleteList() {
        const deleteListContainer = document.getElementById('delete-content-list');
        if (!deleteListContainer) return;
        deleteListContainer.innerHTML = '';

        const addItemToDeleteList = (item, type, context = '') => {
            const listItem = document.createElement('div');
            listItem.className = 'delete-list-item';
            listItem.innerHTML = `
                <div class="delete-list-item-info">
                    <strong>${item.title}</strong>
                    <span>${context}</span>
                </div>
                <button data-id="${item.id}" data-type="${type}">Excluir</button>
            `;

            // Click on the whole item to select it
            listItem.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return; // Don't re-trigger if button is clicked
                
                // If it's already selected, deselect it
                if (listItem.classList.contains('selected')) {
                    listItem.classList.remove('selected');
                } else {
                    // Deselect any other selected item
                    const currentlySelected = deleteListContainer.querySelector('.selected');
                    if (currentlySelected) {
                        currentlySelected.classList.remove('selected');
                    }
                    // Select the new one
                    listItem.classList.add('selected');
                }
            });

            listItem.querySelector('button').addEventListener('click', (e) => {
                e.stopPropagation();
                const id = e.target.dataset.id;
                let dbKeyType = e.target.dataset.type; // This is 'movie', 'video', 'series', 'episode'
                
                if (confirm(`Tem certeza que deseja excluir "${item.title}"? Esta ação não pode ser desfeita.`)) {
                    // The removeItem function expects plural keys for top-level content
                    if (dbKeyType === 'movie' || dbKeyType === 'video' || dbKeyType === 'series') {
                        dbKeyType += 's';
                    }
                    removeItem(id, dbKeyType);
                }
            });
            deleteListContainer.appendChild(listItem);
        };

        // Order: Movies, Videos, Series, then Episodes
        db.movies.forEach(item => addItemToDeleteList(item, 'movie', 'Filme'));
        db.videos.forEach(item => addItemToDeleteList(item, 'video', 'Vídeo'));
        db.series.forEach(series => {
            addItemToDeleteList(series, 'series', 'Série (Completa)');
            (series.seasons || []).forEach(season => {
                (season.episodes || []).forEach(ep => addItemToDeleteList(ep, 'episode', `Episódio de: ${series.title} (T${season.season})`));
            });
        });
    }

    // --- UTILITY FUNCTIONS ---
    function findContentById(id) {
        // Search movies
        const movie = db.movies.find(m => m.id === id);
        if (movie) return { item: movie, type: 'movies', url: movie.url };

        // Search videos
        const video = db.videos.find(v => v.id === id);
        if (video) return { item: video, type: 'videos', url: video.url };

        // Search episodes
        for (const series of db.series) {
            for (const season of series.seasons || []) {
                const episode = season.episodes.find(ep => ep.id === id);
                if (episode) {
                    return { item: episode, type: 'episode', url: episode.url, series: series, season: season };
                }
            }
        }
        return null;
    }

    // Data Management Buttons
    document.getElementById('export-data').addEventListener('click', () => {
        const dataStr = JSON.stringify(db, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = 'jbcuriosoplus_backup.json';
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    });

    document.getElementById('import-data-main').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedDb = JSON.parse(e.target.result);
                // Basic validation
                if (importedDb.movies && importedDb.videos && importedDb.series) {
                    if (confirm("Isso irá substituir todos os dados atuais. Deseja continuar?")) {
                        db = importedDb;
                        saveDB();
                        renderAll();
                        alert('Dados importados com sucesso!');
                        window.location.hash = '#home'; // Navigate to home after import
                    }
                } else {
                    alert('Arquivo JSON inválido.');
                }
            } catch (error) {
                alert('Erro ao ler o arquivo JSON.');
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    });

    document.getElementById('reset-data').addEventListener('click', () => {
        if(confirm("TEM CERTEZA? Todos os seus dados serão apagados e substituídos pelos dados padrão.")) {
            db = JSON.parse(JSON.stringify(defaultData));
            watchedDb = []; // Also reset watched history
            saveDB();
            saveWatchedDB();
            renderAll();
            alert('Dados resetados para o padrão.');
        }
    });

    // --- EVENT LISTENERS ---
    window.addEventListener('hashchange', () => navigateTo(window.location.hash));
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Close sidebar on mobile when a link is clicked
            if (sidebar.classList.contains('open')) {
                sidebar.classList.remove('open');
            }
            window.location.hash = e.currentTarget.getAttribute('href');
        });
    });

    window.addEventListener('click', (e) => {
        // Generic click listener to close sidebar if open and click is outside
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target) && e.target !== menuToggle) {
             sidebar.classList.remove('open');
        }
        // Close modal if click is outside of the modal content
        if (e.target === videoPlayerModal) {
            closePlayer();
        }
    });
    
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.add('open');
    });
    closeMenu.addEventListener('click', () => sidebar.classList.remove('open'));
    closeModalBtn.addEventListener('click', closePlayer);

    // --- INITIAL LOAD ---
    renderAll();
});