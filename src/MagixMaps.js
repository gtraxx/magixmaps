/**
 * @copyright MAGIX CMS Copyright (c) 2008-2026 Gerits Aurelien
 * @version 2.0
 * @name MagixMaps
 * @license Dual licensed under the MIT or GPL Version 3 licenses.
 */
class MagixMaps {
    constructor(config) {
        // Fusion des options par défaut avec la configuration utilisateur
        this.config = {
            mapId: 'main-map',
            googleMapId: 'DEMO_MAP_ID',
            lang: 'fr',
            zoom: 15,
            markers: [],
            adminFields: null, // Sera un objet si on est en mode admin
            ...config
        };

        this.instance = null;
        this.libs = {}; // Stockage des librairies Google chargées
        this.markers = [];
        this.directionsRenderer = null;
        this.activeInfoWindow = null;
        this.timer = null;

        // On lance le bootstrap Google
        this.bootstrap();
    }

    /**
     * Chargement du script Google Maps via le Loader moderne
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
     * Initialisation des librairies et des modes
     */
    async init() {
        try {
            // Chargement parallèle des modules nécessaires
            this.libs.maps = await google.maps.importLibrary("maps");
            this.libs.marker = await google.maps.importLibrary("marker");
            this.libs.routes = await google.maps.importLibrary("routes");
            this.libs.geocoding = await google.maps.importLibrary("geocoding");
            this.libs.core = await google.maps.importLibrary("core");

            // Si le conteneur de carte existe
            if (document.getElementById(this.config.mapId)) {
                this.setupMap();
            }

            // Si des champs de détection sont configurés
            if (this.config.adminFields) {
                this.setupAdminWatcher();
            }
        } catch (e) {
            console.error("MagixMaps Error:", e);
        }
    }

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

    renderMarkers() {
        const bounds = new this.libs.core.LatLngBounds();

        this.config.markers.forEach((m, index) => {
            const pos = { lat: parseFloat(m.lat), lng: parseFloat(m.lng) };

            // Utilisation des nouveaux Advanced Markers
            const marker = new this.libs.marker.AdvancedMarkerElement({
                map: this.instance,
                position: pos,
                title: m.company,
                content: this.createMarkerIcon(index + 1)
            });

            // On vérifie si postcode existe, sinon on met une chaîne vide
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

        // Protection zoom infini
        if (this.markers.length > 1) {
            this.instance.fitBounds(bounds);
        } else if (this.markers.length === 1) {
            this.instance.setCenter(this.markers[0].position);
            this.instance.setZoom(this.config.zoom);
        }
        if (this.config.markers.length > 0) {
            // On remplit le panneau avec les infos du premier marqueur
            this.updateAddressPanel(this.config.markers[0]);

            // On ouvre aussi sa bulle d'info (InfoWindow)
            google.maps.event.trigger(this.markers[0], 'click');
        }
    }

    createMarkerIcon(label, color = 'main') {
        const container = document.createElement("div");
        container.className = "marker-custom-wrapper";

        // On passe le paramètre color au script PHP de génération d'image
        const iconUrl = `/${this.config.lang}/gmap/?marker=${color}&dotless=true`;

        container.innerHTML = `
        <img src="${iconUrl}" style="display:block;">
        <span class="marker-label" style="position:absolute; top:12px; left:50%; transform:translateX(-50%); color:white; font-weight:bold; font-size:12px;">${label}</span>
    `;
        return container;
    }

    async calculateRoute(origin) {
        if (!origin) return;
        const service = new this.libs.routes.DirectionsService();

        // Nettoyage des anciens drapeaux s'ils existent
        if (this.routeFlags) {
            this.routeFlags.forEach(f => f.map = null);
        }
        this.routeFlags = [];

        if (!this.directionsRenderer) {
            this.directionsRenderer = new this.libs.routes.DirectionsRenderer({
                map: this.instance,
                panel: document.getElementById('r-directions'),
                suppressMarkers: true // On cache les marqueurs A/B par défaut de Google
            });
        }

        try {
            const result = await service.route({
                origin: origin,
                destination: this.markers[0].position, // On vise le premier marqueur
                travelMode: google.maps.TravelMode.DRIVING
            });

            this.directionsRenderer.setDirections(result);
            const leg = result.routes[0].legs[0];

            const markerA = new this.libs.marker.AdvancedMarkerElement({
                map: this.instance,
                position: leg.start_location,
                content: this.createMarkerIcon('A', 'grey') // Couleur grise pour le départ
            });

            const markerB = new this.libs.marker.AdvancedMarkerElement({
                map: this.instance,
                position: leg.end_location,
                content: this.createMarkerIcon('B', 'main') // Couleur pour l'arrivée
            });

            // On stocke ces marqueurs pour pouvoir les effacer plus tard
            this.routeFlags.push(markerA, markerB);

            // Ajustement automatique de la vue pour voir tout l'itinéraire
            const bounds = new this.libs.core.LatLngBounds();
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
            this.instance.fitBounds(bounds);

            document.getElementById('r-directions').classList.add('sizedirection');

        } catch (e) {
            alert("Désolé, nous n'avons pas trouvé d'itinéraire pour cette adresse.");
        }
    }

    setupUIEvents() {
        // Toggle du panneau
        const hideBtn = document.querySelector('.hidepanel');
        if (hideBtn) {
            hideBtn.addEventListener('click', () => {
                document.getElementById('gmap-address').classList.toggle('open');
                hideBtn.classList.toggle('open');
            });
        }

        // Formulaire itinéraire
        const form = document.querySelector('.form-search');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const start = document.getElementById('getadress').value;
                this.calculateRoute(start);
            });
        }
    }

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
            ['keyup', 'change', 'focusout'].forEach(evt => {
                input.addEventListener(evt, () => this.debounceGeocode());
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
                    // Petit feedback visuel
                    f.lat.style.transition = 'background 0.3s';
                    f.lat.style.backgroundColor = '#d4edda';
                    setTimeout(() => f.lat.style.backgroundColor = '', 500);
                }
            } catch (e) { console.warn("Geocoding failed"); }
        }, 1000);
    }
}