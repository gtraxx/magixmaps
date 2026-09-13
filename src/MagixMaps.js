/**
 * @copyright MAGIX CMS Copyright (c) 2008-2026 Gerits Aurelien
 * @version 3.0
 * @name MagixMaps
 * @license Dual licensed under the MIT or GPL Version 3 licenses.
 */
class MagixMaps {
    /**
     * Constructor
     * @param config
     */
    constructor(config) {
        // 1. Fusion et options par défaut
        this.config = {
            mapId: 'main-map',
            googleMapId: 'DEMO_MAP_ID',
            lang: 'fr',
            zoom: 15,
            markers: [],
            adminFields: null,
            ...config
        };

        // 2. Nettoyage immédiat des données
        this.sanitizeData();

        // Initialisation des propriétés internes
        this.instance = null;
        this.libs = {};
        this.markers = [];
        this.routeFlags = [];
        this.activeInfoWindow = null;
        this.timer = null;
        this.eventListeners = []; // Pour le nettoyage futur
        // 1. Dans le constructor(), remplacez this.directionsRenderer par :
        this.routePolyline = null;
        // 3. Lancement du chargement
        this.bootstrap();
    }

    /**
     * Nettoyage et validation des coordonnées (virgules, strings, NaN)
     */
    sanitizeData() {
        if (!this.config.markers || !Array.isArray(this.config.markers)) return;

        this.config.markers = this.config.markers
            .map(m => {
                const cleanLat = parseFloat(String(m.lat).replace(',', '.'));
                const cleanLng = parseFloat(String(m.lng).replace(',', '.'));
                return { ...m, lat: cleanLat, lng: cleanLng };
            })
            .filter(m => !isNaN(m.lat) && !isNaN(m.lng));

        if (this.config.markers.length === 0 && !this.config.adminFields) {
            console.warn("MagixMaps: Aucun marqueur valide trouvé.");
        }
    }

    /**
     * Chargement asynchrone de l'API Google Maps
     */
    bootstrap() {
        ((g) => {
            var h, a, k, p = "The Google Maps JavaScript API", c = "google", l = "importLibrary", q = "__ib__", m = document, b = window;
            b = b[c] || (b[c] = {}); var d = b.maps || (b.maps = {}), r = new Set, e = new URLSearchParams, u = () => h || (h = new Promise(async (f, n) => {
                await (a = m.createElement("script")); e.set("libraries", [...r] + ""); for (k in g) e.set(k.replace(/[A-Z]/g, t => "_" + t[0].toLowerCase()), g[k]);
                e.set("callback", c + ".maps." + q); a.src = `https://maps.${c}apis.com/maps/api/js?` + e; d[q] = f; a.onerror = () => h = n(Error(p + " could not load."));
                a.nonce = m.querySelector("script[nonce]")?.nonce || ""; m.head.append(a)
            })); d[l] ? console.warn(p + " only loads once. Ignoring:", g) : d[l] = (f, ...n) => r.add(f) && u().then(() => d[l](f, ...n))
        })({
            key: this.config.api_key,
            v: "weekly",
            lang: this.config.lang
        });

        this.init();
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async init() {
        try {
            this.libs.maps = await google.maps.importLibrary("maps");
            this.libs.marker = await google.maps.importLibrary("marker");
            this.libs.routes = await google.maps.importLibrary("routes");
            this.libs.geocoding = await google.maps.importLibrary("geocoding");
            this.libs.core = await google.maps.importLibrary("core");

            if (document.getElementById(this.config.mapId)) {
                this.setupMap();
            }

            if (this.config.adminFields) {
                this.setupAdminWatcher();
            }
        } catch (e) {
            console.error("MagixMaps Error:", e);
        }
    }

    /**
     *
     */
    setupMap() {
        const el = document.getElementById(this.config.mapId);
        const mapOptions = {
            zoom: this.config.zoom,
            center: this.config.markers[0] ? { lat: this.config.markers[0].lat, lng: this.config.markers[0].lng } : { lat: 48.85, lng: 2.35 },
            mapId: el.dataset.mapId || this.config.googleMapId,
            mapTypeControl: true,
            streetViewControl: true
        };

        this.instance = new this.libs.maps.Map(el, mapOptions);
        this.renderMarkers();
        this.setupUIEvents();
    }

    /**
     * renderMarkers
     */
    renderMarkers() {
        const bounds = new this.libs.core.LatLngBounds();

        this.config.markers.forEach((m, index) => {
            const pos = { lat: m.lat, lng: m.lng };

            const marker = new this.libs.marker.AdvancedMarkerElement({
                map: this.instance,
                position: pos,
                title: m.company,
                content: this.createMarkerIcon(index + 1)
            });

            const cp = m.postcode ? m.postcode + ' ' : '';
            const contentString = `<strong>${m.company}</strong><br>${m.address}<br>${cp}${m.city}`;
            const infowindow = new google.maps.InfoWindow({ content: contentString });

            marker.addListener('click', () => {
                if (this.activeInfoWindow) this.activeInfoWindow.close();
                infowindow.open({ map: this.instance, anchor: marker });
                this.activeInfoWindow = infowindow;
                this.updateAddressPanel(m);
            });

            this.markers.push(marker);
            bounds.extend(pos);
        });

        if (this.markers.length > 1) {
            this.instance.fitBounds(bounds);
        } else if (this.markers.length === 1) {
            this.instance.setCenter(this.markers[0].position);
            this.instance.setZoom(this.config.zoom);
        }

        if (this.config.markers.length > 0) {
            this.updateAddressPanel(this.config.markers[0]);
            google.maps.event.trigger(this.markers[0], 'click');
        }
    }

    /**
     *
     * @param label
     * @param color
     * @returns {Element | WebAssembly.TableKind}
     */
    createMarkerIcon(label, color = 'main') {
        // Définition des couleurs selon l'argument
        const bgColor = color === 'main' ? '#2c3e50' : '#95a5a6';
        const borderColor = color === 'main' ? '#1a252f' : '#7f8c8d';

        // Utilisation de la classe native PinElement de Google
        const pin = new this.libs.marker.PinElement({
            glyph: String(label),
            glyphColor: 'white',
            background: bgColor,
            borderColor: borderColor
        });

        return pin.element;
    }

    /**
     * 2. Dans calculateRoute(origin), modifiez la logique de rendu :
     * @param origin
     * @returns {Promise<void>}
     */
    async calculateRoute(origin) {
        if (!origin) return;

        // 1. Nettoyage de l'ancienne route
        if (this.routeFlags) this.routeFlags.forEach(f => f.map = null);
        this.routeFlags = [];

        if (this.routePolyline) {
            this.routePolyline.setMap(null);
        }

        try {
            // 2. Appel à la nouvelle architecture Routes API (côté JS)
            const response = await this.libs.routes.Route.computeRoutes({
                origin: origin,
                destination: this.markers[0].position,
                travelMode: 'DRIVING',
                fields: ['*']
            });

            // 3. Extraction de la route principale
            const route = response.routes[0];
            const leg = route.legs[0];

            // 4. Tracé direct de la ligne bleue
            this.routePolyline = new this.libs.maps.Polyline({
                path: route.path, // route.path est un tableau d'objets LatLng
                map: this.instance,
                strokeColor: '#3498db',
                strokeWeight: 5,
                strokeOpacity: 0.8
            });

            // NOUVEAU : Extraction sécurisée des coordonnées de départ et d'arrivée
            const startPos = route.path[0];
            const endPos = route.path[route.path.length - 1];

            // 5. Placement des marqueurs A et B avec les coordonnées exactes
            const markerA = new this.libs.marker.AdvancedMarkerElement({
                map: this.instance,
                position: startPos,
                content: this.createMarkerIcon('A', 'grey')
            });

            const markerB = new this.libs.marker.AdvancedMarkerElement({
                map: this.instance,
                position: endPos,
                content: this.createMarkerIcon('B', 'main')
            });

            this.routeFlags.push(markerA, markerB);

            // 6. Recadrage de la carte sur le départ et l'arrivée
            const bounds = new this.libs.core.LatLngBounds();
            bounds.extend(startPos);
            bounds.extend(endPos);
            this.instance.fitBounds(bounds);

            // 7. Génération manuelle des instructions textuelles (Pour remplacer DirectionsRenderer)
            const directionsPanel = document.getElementById('r-directions');
            if (directionsPanel && leg.steps) {
                let html = '<ul class="adp-list">';

                // On boucle sur chaque étape de l'itinéraire renvoyée par Google
                leg.steps.forEach(step => {
                    // FALLBACK : On cherche le texte sous toutes ses formes connues (anciennes et nouvelles API)
                    const instructionText = (step.navigationInstruction && step.navigationInstruction.instructions)
                        || step.instructions
                        || step.htmlInstructions;

                    if (instructionText) {
                        html += `<li class="adp-step">${instructionText}</li>`;
                    }
                });

                html += '</ul>';

                // DÉBOGAGE : Si la boucle n'a rien trouvé, on affiche un avertissement
                if (html === '<ul class="adp-list"></ul>') {
                    console.warn("Le texte est introuvable. Voici un aperçu de l'objet 'step' renvoyé par Google :", leg.steps[0]);
                    html = '<div style="padding:15px;">Instructions détaillées non disponibles. (Vérifiez la console)</div>';
                }

                // On injecte le HTML et on active la classe CSS pour ouvrir le panneau
                directionsPanel.innerHTML = html;
                directionsPanel.classList.add('sizedirection');
            } else {
                console.warn("Impossible de générer le panneau : directionsPanel introuvable ou leg.steps indéfini.", leg);
            }

        } catch (e) {
            console.error("Erreur MagixMaps v3 (Routes API):", e);
            alert("Itinéraire introuvable ou erreur de l'API Routes.");
        }
    }

    setupUIEvents() {
        const hideBtn = document.querySelector('.hidepanel');
        if (hideBtn) {
            const toggleFn = () => {
                document.getElementById('gmap-address').classList.toggle('open');
                hideBtn.classList.toggle('open');
            };
            hideBtn.addEventListener('click', toggleFn);
            this.eventListeners.push({ el: hideBtn, ev: 'click', fn: toggleFn });
        }

        const form = document.querySelector('.form-search');
        if (form) {
            const searchFn = (e) => {
                e.preventDefault();
                const start = document.getElementById('getadress').value;
                this.calculateRoute(start);
            };
            form.addEventListener('submit', searchFn);
            this.eventListeners.push({ el: form, ev: 'submit', fn: searchFn });
        }
    }

    /**
     * updateAddressPanel
     * @param m
     */
    updateAddressPanel(m) {
        const addrEl = document.querySelector('#address .address');
        const cityEl = document.querySelector('#address .city');
        if (addrEl) addrEl.textContent = m.address || '';
        if (cityEl) {
            const cp = m.postcode ? m.postcode + ' ' : '';
            cityEl.textContent = cp + (m.city || '');
        }
    }

    setupAdminWatcher() {
        const f = this.config.adminFields;
        const inputs = [f.street, f.postcode, f.city, f.country].filter(i => i !== undefined);
        inputs.forEach(input => {
            const fn = () => this.debounceGeocode();
            ['keyup', 'change', 'focusout'].forEach(evt => {
                input.addEventListener(evt, fn);
                this.eventListeners.push({ el: input, ev: evt, fn: fn });
            });
        });
    }

    debounceGeocode() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(async () => {
            const f = this.config.adminFields;
            const address = `${f.street.value}, ${f.postcode.value} ${f.city.value}, ${f.country ? f.country.value : ''}`;
            if (address.length < 10) return;
            const geocoder = new this.libs.geocoding.Geocoder();
            try {
                const { results } = await geocoder.geocode({ address: address });
                if (results && results[0]) {
                    const loc = results[0].geometry.location;
                    f.lat.value = loc.lat();
                    f.lng.value = loc.lng();
                    f.lat.style.backgroundColor = '#d4edda';
                    setTimeout(() => f.lat.style.backgroundColor = '', 500);
                }
            } catch (e) { console.warn("Geocoding failed"); }
        }, 1000);
    }

    /**
     * Nettoyage complet de l'instance
     */
    destroy() {
        console.log("MagixMaps: Destruction de l'instance...");

        // 1. Arrêt du minuteur
        if (this.timer) clearTimeout(this.timer);

        // 2. Suppression des marqueurs
        this.markers.forEach(m => m.map = null);
        this.routeFlags.forEach(f => f.map = null);
        this.markers = [];
        this.routeFlags = [];

        // 3. Fermeture de l'InfoWindow
        if (this.activeInfoWindow) this.activeInfoWindow.close();

        // 4. Nettoyage de la ligne d'itinéraire
        if (this.routePolyline) this.routePolyline.setMap(null);

        // 5. Suppression des écouteurs d'événements DOM
        this.eventListeners.forEach(item => {
            item.el.removeEventListener(item.ev, item.fn);
        });

        // 6. Nettoyage du conteneur
        const el = document.getElementById(this.config.mapId);
        if (el) el.innerHTML = '';

        this.instance = null;
    }
}