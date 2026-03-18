document.addEventListener('DOMContentLoaded', () => {
    const movieGrid = document.getElementById('movieGrid');
    const heroBg = document.getElementById('heroBg');
    const filterButtons = document.querySelectorAll('.hero-actions .filter-btn');
    const phaseButtons = document.querySelectorAll('#phaseFilters .filter-btn');
    
    // Settings Gear Elements
    const gearBtn = document.getElementById('gearBtn');
    const gearMenu = document.getElementById('gearMenu');
    const qualityOptions = document.getElementById('qualityOptions');
    
    // Toggle Gear Menu
    if (gearBtn) {
        gearBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            gearMenu.style.display = gearMenu.style.display === 'none' ? 'block' : 'none';
        });
    }

    const fsBtn = document.getElementById('fsBtn');
    if (fsBtn) {
        fsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const container = document.getElementById('videoPlayerContainer');
            if (!document.fullscreenElement) {
                container.requestFullscreen().catch(console.error);
            } else {
                document.exitFullscreen();
            }
        });
    }
    
    // Modal Elements
    const modal = document.getElementById('movieModal');
    const closeModal = document.querySelector('.close-modal');
    const modalPoster = document.getElementById('modalPoster');
    const modalTitle = document.getElementById('modalTitle');
    const modalSynopsis = document.getElementById('modalSynopsis');
    const modalPlayBtn = document.getElementById('modalPlayBtn');
    const characterGrid = document.getElementById('characterGrid');

    let mcuData = [];
    let currentFilter = 'all';
    let currentPhase = 'all';

    async function loadData() {
        try {
            const response = await fetch('data.json');
            mcuData = await response.json();
            renderGrid();
        } catch (error) {
            console.error('Error loading MCU data:', error);
        }
    }

    function proxyImage(url) {
        if (!url) return '';
        // If it's a local file or already proxied, return as is
        if (url.startsWith('mcu_') || url.includes('images.weserv.nl')) return url;
        // Proxy all external images to avoid hotlinking/CORB issues
        if (url.startsWith('http')) {
            return `https://images.weserv.nl/?url=${encodeURIComponent(url)}&default=https://raw.githubusercontent.com/StarkSector4201/mcu-archive/main/webapp/mcu_hero.png`;
        }
        return url;
    }

    function renderGrid() {
        if (!movieGrid) return;
        movieGrid.innerHTML = '';
        
        const filtered = mcuData.filter(item => {
            const typeMatch = currentFilter === 'all' || item.type === currentFilter;
            const phaseMatch = currentPhase === 'all' || item.phase.toString() === currentPhase;
            return typeMatch && phaseMatch;
        });

        filtered.forEach(item => {
            const card = document.createElement('div');
            card.className = 'movie-card loading';
            const proxiedPoster = proxyImage(item.poster);
            
            // Create an image object to check for loading/error
            const img = new Image();
            img.src = proxiedPoster;
            img.onload = () => {
                card.classList.remove('loading');
                card.style.backgroundImage = `url("${proxiedPoster}")`;
            };
            img.onerror = () => {
                card.classList.remove('loading');
                card.classList.add('image-error');
                card.innerHTML += `<div class="error-overlay">SIGNAL LOST</div>`;
            };
            
            card.innerHTML = `
                <div class="card-badge phase-badge">PHASE ${item.phase}</div>
                <div class="card-badge year-badge">${item.year}</div>
                <div class="card-content">
                    <h3 class="card-title">${item.title}</h3>
                    <div class="card-hover-hint">PLAY NOW ></div>
                </div>
            `;
            
            card.onclick = () => showDetails(item);
            movieGrid.appendChild(card);
        });
    }

    function showDetails(item) {
        if (!modal) return;
        
        modalTitle.innerText = item.title;
        modalYearPhase.innerText = `PHASE ${item.phase} | ${item.year}`;
        modalSynopsis.innerText = item.synopsis || "Strategic intelligence gathering in progress for this mission...";
        
        // Handle Modal Poster Fallback
        modalPoster.src = '';
        modalPoster.classList.add('loading');
        const mainImg = new Image();
        mainImg.src = proxyImage(item.poster);
        mainImg.onload = () => {
            modalPoster.classList.remove('loading');
            modalPoster.src = mainImg.src;
        };
        mainImg.onerror = () => {
            modalPoster.classList.remove('loading');
            modalPoster.src = '/static/mcu_hero.png'; // Fallback to hero image
        };
        
        const videoContainer = document.getElementById('videoPlayerContainer');
        const videoPlayer = document.getElementById('mainVideo');
        const headerGrid = document.querySelector('.modal-header-grid');

        const customControls = document.querySelector('.player-custom-controls');

        // Reset Player State
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = "";
            videoContainer.style.display = 'none';
            modalPoster.style.display = 'block';
            headerGrid.classList.remove('playing-mode');
            if (gearMenu) gearMenu.style.display = 'none';
            if (customControls) customControls.style.display = 'none'; // Hide until playing
        }

        // Subtitle Selection Function
        async function updateSubtitles(src) {
            const tracks = videoPlayer.querySelectorAll('track');
            tracks.forEach(t => t.remove());

            if (src) {
                try {
                    const response = await fetch(src);
                    let text = await response.text();
                    
                    // Convert SRT format `00:00:00,000` to VTT format `00:00:00.000`
                    // Add line:80% to push subtitles up from the bottom letterbox
                    if (!text.includes('WEBVTT')) {
                        text = 'WEBVTT\n\n' + text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})\s-->\s(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2 --> $3.$4 line:80%');
                    }
                    
                    const blob = new Blob([text], { type: 'text/vtt' });
                    const blobUrl = URL.createObjectURL(blob);

                    const track = document.createElement('track');
                    track.kind = "subtitles";
                    track.label = "Arabic";
                    track.srclang = "ar";
                    track.src = blobUrl;
                    track.default = true;
                    videoPlayer.appendChild(track);
                } catch(e) {
                    console.error("Tactical Error: Subtitle fetch failed", e);
                }
            }
        }

        const subOptions = document.querySelectorAll('.sub-option');
        subOptions.forEach(opt => {
            opt.onclick = (e) => {
                e.stopPropagation();
                subOptions.forEach(s => s.classList.remove('active'));
                opt.classList.add('active');
                if (videoPlayer && videoPlayer.src) {
                    const subType = opt.dataset.sub;
                    if (subType === 'ar') updateSubtitles(item.subtitle_ar);
                    if (subType === 'en') updateSubtitles(item.subtitle_en);
                    if (subType === 'off') updateSubtitles(null);
                }
            };
        });

        modalPlayBtn.onclick = (e) => {
            e.preventDefault();
            const telegramLink = item.telegram_link;
            const watchLink = item.watch_link;
            
            const streamLink = [watchLink, telegramLink].find(l => l && (l.includes('.mp4') || l.includes('.mkv') || l.includes('.webm') || l.includes('/stream/')));
            
            if (streamLink) {
                // UI transition to Enlarge Player
                modalPoster.style.display = 'none';
                headerGrid.classList.add('playing-mode');
                videoContainer.style.display = 'flex';
                videoPlayer.src = streamLink;

                const activeSub = document.querySelector('.sub-option.active');
                if (activeSub) {
                    const subType = activeSub.dataset.sub;
                    if (subType === 'ar') updateSubtitles(item.subtitle_ar);
                    if (subType === 'en') updateSubtitles(item.subtitle_en);
                    if (subType === 'off') updateSubtitles(null);
                }

                // Setup Quality Options Gear
                if (qualityOptions && customControls) {
                    qualityOptions.innerHTML = '';
                    customControls.style.display = 'flex'; // Show controls when video starts
                    
                    const qualities = [
                        { label: 'Auto (Original)', link: item.watch_link || streamLink },
                        { label: '1080p BluRay', link: item.watch_link_1080 },
                        { label: '720p HD', link: item.watch_link_720 },
                        { label: '480p SD', link: item.watch_link_480 }
                    ];
                    
                    qualities.forEach(q => {
                        const btn = document.createElement('button');
                        btn.innerText = q.label;
                        btn.className = 'gear-opt-btn';
                        
                        if (!q.link) {
                            btn.style.opacity = '0.5';
                            btn.style.cursor = 'not-allowed';
                            btn.title = 'Not Available';
                        }
                        
                        if (q.link && videoPlayer.src === q.link) {
                            btn.classList.add('active');
                        }
                        
                        btn.onclick = (e) => {
                            e.stopPropagation();
                            if (!q.link) return;
                            
                            const currentTime = videoPlayer.currentTime;
                            const isPaused = videoPlayer.paused;
                            
                            videoPlayer.src = q.link;
                            videoPlayer.currentTime = currentTime;
                            
                            const activeSub = document.querySelector('.sub-option.active');
                            if (activeSub) {
                                const subType = activeSub.dataset.sub;
                                if (subType === 'ar') updateSubtitles(item.subtitle_ar);
                                if (subType === 'en') updateSubtitles(item.subtitle_en);
                                if (subType === 'off') updateSubtitles(null);
                            }
                            
                            if (!isPaused) videoPlayer.play();
                            gearMenu.style.display = 'none';
                            
                            // Reset bolding
                            Array.from(qualityOptions.children).forEach(c => c.classList.remove('active'));
                            btn.classList.add('active');
                        };
                        qualityOptions.appendChild(btn);
                    });
                }

                videoPlayer.play().catch(console.error);
                return false;
            } else {
                alert("Encrypted Stream Unavailable. Data missing.");
            }
            return false;
        };

        // Render Character Cards
        characterGrid.innerHTML = '';
        if (item.characters && item.characters.length > 0) {
            item.characters.forEach(char => {
                const charCard = document.createElement('div');
                charCard.className = 'char-card';
                const charImgSrc = proxyImage(char.img);
                
                charCard.innerHTML = `
                    <div class="char-img-container">
                        <img src="${charImgSrc}" alt="${char.name}" class="char-img" onerror="this.src='/static/mcu_hero.png';this.parentElement.classList.add('img-fail');">
                    </div>
                    <span class="char-name">${char.name}</span>
                    <span class="char-role">${char.role}</span>
                    <span class="char-actor">${char.actor}</span>
                `;
                characterGrid.appendChild(charCard);
            });
        }

        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function stopVideo() {
        const videoPlayer = document.getElementById('mainVideo');
        if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.src = "";
        }
    }

    // Modal Closing Logic
    if (closeModal) {
        closeModal.onclick = () => {
            stopVideo();
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    window.onclick = (event) => {
        if (gearMenu && gearMenu.style.display === 'block' && !event.target.closest('.player-custom-controls') && !event.target.closest('#gearMenu')) {
            gearMenu.style.display = 'none';
        }
        if (event.target == modal && !document.fullscreenElement) {
            stopVideo();
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    // Type Filters
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderGrid();
        });
    });

    // Phase Filters
    phaseButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            phaseButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentPhase = btn.dataset.phase;
            renderGrid();
        });
    });

    // --- STARK DASHBOARD LOGIC ---
    class StarkDashboard {
        constructor() {
            this.modal = document.getElementById('starkDashboard');
            this.authPanel = document.getElementById('adminAuth');
            this.panel = document.getElementById('adminPanel');
            this.tokenInput = document.getElementById('ghToken');
            this.authBtn = document.getElementById('authBtn');
            this.commitBtn = document.getElementById('commitBtn');
            this.adminGrid = document.getElementById('adminMovieGrid');
            this.closeBtn = document.querySelector('.close-admin');
            
            this.repoOwner = 'StarkSector4201';
            this.repoName = 'mcu-archive';
            this.filePath = 'data.json';
            this.token = localStorage.getItem('stark_token') || '';
            this.fileSha = '';
            
            this.init();
        }

        init() {
            if (this.token) this.tokenInput.value = this.token;
            
            this.authBtn.onclick = () => this.authorize();
            this.commitBtn.onclick = () => this.commitChanges();
            
            if (this.closeBtn) {
                this.closeBtn.onclick = () => this.modal.style.display = 'none';
            }
            
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get('mode') === 'stark') {
                this.modal.style.display = 'block';
                if (this.token) this.authorize();
            }
        }

        async authorize() {
            this.token = this.tokenInput.value.trim();
            if (!this.token) return alert("Soldier, I need a token to access the archives.");
            
            localStorage.setItem('stark_token', this.token);
            this.authBtn.innerText = "AUTHORIZING...";
            
            try {
                const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`, {
                    headers: { 'Authorization': `token ${this.token}` }
                });
                
                if (!response.ok) throw new Error("Invalid Token or Repository Access Restricted.");
                
                const fileData = await response.json();
                this.fileSha = fileData.sha;
                
                this.authPanel.style.display = 'none';
                this.panel.style.display = 'flex';
                this.renderAdminMovies();
                
            } catch (error) {
                alert(`Tactical Error: ${error.message}`);
                this.authBtn.innerText = "AUTHORIZE";
            }
        }

        renderAdminMovies() {
            this.adminGrid.innerHTML = '';
            mcuData.forEach((movie, index) => {
                const item = document.createElement('div');
                item.className = 'admin-movie-item';
                item.innerHTML = `
                    <img src="${proxyImage(movie.poster)}" class="admin-thumb">
                    <div class="admin-edit-form">
                        <div class="admin-field" style="grid-column: span 2;">
                            <label>TITLE</label>
                            <input type="text" value="${movie.title}" disabled>
                        </div>
                        <div class="admin-field">
                            <label>AUTO / DEFAULT LINK</label>
                            <input type="text" class="edit-link" data-index="${index}" value="${movie.watch_link || ''}">
                        </div>
                        <div class="admin-field">
                            <label>1080p BLURAY LINK</label>
                            <input type="text" class="edit-1080" data-index="${index}" value="${movie.watch_link_1080 || ''}">
                        </div>
                        <div class="admin-field">
                            <label>720p HD LINK</label>
                            <input type="text" class="edit-720" data-index="${index}" value="${movie.watch_link_720 || ''}">
                        </div>
                        <div class="admin-field">
                            <label>480p SD LINK</label>
                            <input type="text" class="edit-480" data-index="${index}" value="${movie.watch_link_480 || ''}">
                        </div>
                        <div class="admin-field" style="grid-column: span 1;">
                            <label>ARABIC SUBTITLES (.SRT)</label>
                            <input type="text" class="edit-sub-ar" data-index="${index}" value="${movie.subtitle_ar || ''}">
                        </div>
                        <div class="admin-field" style="grid-column: span 1;">
                            <label>ENGLISH SUBTITLES (.SRT)</label>
                            <input type="text" class="edit-sub-en" data-index="${index}" value="${movie.subtitle_en || ''}">
                        </div>
                    </div>
                `;
                this.adminGrid.appendChild(item);
            });
        }

        async commitChanges() {
            const links = document.querySelectorAll('.edit-link');
            const links1080 = document.querySelectorAll('.edit-1080');
            const links720 = document.querySelectorAll('.edit-720');
            const links480 = document.querySelectorAll('.edit-480');
            const subsAr = document.querySelectorAll('.edit-sub-ar');
            const subsEn = document.querySelectorAll('.edit-sub-en');
            
            links.forEach(input => {
                const idx = input.dataset.index;
                mcuData[idx].watch_link = input.value.trim();
            });
            links1080.forEach(input => {
                mcuData[input.dataset.index].watch_link_1080 = input.value.trim();
            });
            links720.forEach(input => {
                mcuData[input.dataset.index].watch_link_720 = input.value.trim();
            });
            links480.forEach(input => {
                mcuData[input.dataset.index].watch_link_480 = input.value.trim();
            });
            subsAr.forEach(input => {
                const idx = input.dataset.index;
                mcuData[idx].subtitle_ar = input.value.trim();
            });
            subsEn.forEach(input => {
                const idx = input.dataset.index;
                mcuData[idx].subtitle_en = input.value.trim();
            });

            this.commitBtn.disabled = true;
            this.commitBtn.innerText = "COMMITTING...";

            try {
                const content = btoa(unescape(encodeURIComponent(JSON.stringify(mcuData, null, 4))));
                const response = await fetch(`https://api.github.com/repos/${this.repoOwner}/${this.repoName}/contents/${this.filePath}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${this.token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        message: "Tactical Update: Synchronizing Hub Database",
                        content: content,
                        sha: this.fileSha
                    })
                });

                if (!response.ok) throw new Error("Commit Protocol Failed.");
                
                const result = await response.json();
                this.fileSha = result.content.sha;
                alert("Mission Success: Hub database updated. Changes will be live in 60 seconds.");
                this.commitBtn.innerText = "COMMIT CHANGES";
                this.commitBtn.disabled = false;
                
            } catch (error) {
                alert(`Deployment Failed: ${error.message}`);
                this.commitBtn.innerText = "COMMIT CHANGES";
                this.commitBtn.disabled = false;
            }
        }
    }

    const dashboard = new StarkDashboard();
    loadData();
});
