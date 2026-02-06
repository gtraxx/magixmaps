# MagixMaps Library
![Image](https://github.com/user-attachments/assets/a765cf46-a556-4421-9b38-f093f502f03f)

MagixMaps est une bibliothèque JavaScript légère, performante et sans dépendances (Vanilla JS), conçue pour intégrer l'API Google Maps (version 2026) dans tout projet web.

Initialement développée pour le système Magix CMS, cette version a été isolée et optimisée pour une utilisation universelle. Elle est compatible avec tous les environnements (sites statiques, PHP, frameworks JS) sans modification du noyau de la bibliothèque.

### version

[![release](https://img.shields.io/github/release/gtraxx/magixmaps.svg)](https://github.com/gtraxx/magixmaps/releases/latest)
[🚀 Voir la démo en direct](https://gtraxx.github.io/magixmaps/)

---

## Caractéristiques techniques

* **Vanilla JS** : Aucune dépendance à jQuery ou autre bibliothèque tierce.
* **Modernité** : Support complet des Advanced Marker Elements de Google.
* **Architecture Hybride** : Gère l'affichage interactif (Front-end) et la géolocalisation automatique (Administration) via une instance unique.
* **Performance** : Chargement asynchrone et modulaire des composants Google (Geocoding, Routes, Marker).
* **Flexibilité** : Personnalisation complète par variables CSS (Custom Properties).

---

### Note de configuration : Google Cloud Console
Pour utiliser MagixMaps, vous devez disposer d'un projet actif sur la Google Cloud Console.
* API Key : Activez "Maps JavaScript API" et générez une clé API.
* Map ID (googleMapId) : Pour profiter des Advanced Markers (marqueurs personnalisés et performants), vous devez créer un Map ID dans votre console Google Cloud (configuré sur le type de plateforme "JavaScript") et l'associer à votre carte.

Restrictions : Pour la mise en production, n'oubliez pas de restreindre votre clé API à votre nom de domaine (my-domain.tld par exemple) afin d'éviter toute utilisation non autorisée.

## Installation

1. Inclure les fichiers dans votre projet :

```html
<link rel="stylesheet" href="dist/magixmaps.css">
<link rel="stylesheet" href="dist/magixmaps.min.css">
<script src="dist/magixmaps.js"></script>
```

2. Préparer le conteneur HTML requis :

```html
<div id="magix-maps-container">
    <div id="main-map" data-map-id="VOTRE_MAP_ID_GOOGLE"></div>
</div>
```

## Utilisation
1. Mode Carte Interactive (Front-office)

Utilisé pour afficher des points géographiques avec moteur de calcul d'itinéraire intégré.

```javascript
const myAdd = [
   {
      company: "Magix Office",
      address: "Rue de la Station",
      postcode: "4500",
      city: "Huy",
      lat: 50.52, // Type: Number
      lng: 5.24   // Type: Number
   }
];

const map = new MagixMaps({
   api_key: 'VOTRE_CLE_API_GOOGLE',
   googleMapId: 'VOTRE_MAP_ID',
   lang: 'fr',
   zoom: 15,
   markers: myAdd
});
```
## Structure des données (markers)
Chaque objet du tableau markers accepte les propriétés suivantes : 

| Propriété | Type | Description |
| :--- | :--- | :--- |
| **company** | String | Nom affiché dans la fenêtre d'information (InfoWindow). |
| **address** | String | Adresse textuelle (utilisée pour l'affichage et l'itinéraire). |
| **city** | String | Ville de destination. |
| **lat** | `Number` (float) | Latitude précise (ex: 50.52). **Obligatoire**. |
| **lng** | `Number` (float) | Longitude précise (ex: 5.24). **Obligatoire**. |

2. Mode Administration (Géocodage automatique)
   Utilisé pour synchroniser en temps réel des champs de formulaire avec les coordonnées GPS.

```javascript
new MagixMaps({
   api_key: 'VOTRE_CLE_API_GOOGLE',
   googleMapId: 'DEMO_MAP_ID',
   adminFields: {
      street: document.querySelector('.input-rue'),
      postcode: document.querySelector('.input-cp'),
      city: document.querySelector('.input-ville'),
      lat: document.querySelector('.input-lat'),
      lng: document.querySelector('.input-lng')
   }
});
```

## Gestion du cycle de vie : La méthode destroy()
Dans les applications web modernes (AJAX, Single Page Applications, ou chargement dynamique de contenu), il est crucial de ne pas laisser de traces en mémoire lorsqu'un composant n'est plus utilisé.
La méthode `destroy()` permet un nettoyage complet de l'instance pour garantir la performance et la stabilité du navigateur :

* **Libération de la mémoire** : Supprime physiquement tous les marqueurs (Advanced Markers), les itinéraires et les instances de l'API Google Maps.
* **Nettoyage des événements** : Retire proprement tous les écouteurs d'événements (`Event Listeners`) sur les formulaires et les boutons pour éviter les fuites de mémoire.
* **Arrêt des processus** : Stoppe instantanément les minuteurs (`timers`) de géocodage en cours pour éviter des requêtes API inutiles en arrière-plan.
* **Remise à zéro du DOM** : Vide le conteneur HTML de la carte pour le laisser prêt à une nouvelle initialisation.
```javascript
const map = new MagixMaps(config);
// Plus tard...
map.destroy();
```

3. Personnalisation graphique
L'apparence de l'interface est gérée via des variables CSS éditables directement dans votre feuille de style principale ou dans un bloc style :

```css
:root {
    --mm-main-color: #2c3e50; /* Couleur d'accentuation principale */
    --mm-map-height: 600px;   /* Hauteur du conteneur de la carte */
    --mm-panel-width: 400px;  /* Largeur du panneau d'itinéraire */
}
```

## Dépannage (Troubleshooting)
Pour un fonctionnement optimal, vérifiez que les services suivants sont activés dans votre console Google Cloud :
* Maps JavaScript API : Nécessaire pour l'affichage de la carte.
* Geocoding API : Nécessaire pour la conversion d'adresses en coordonnées.
* Directions API : Nécessaire pour le calcul d'itinéraires.

Assurez-vous également que votre clé API dispose des restrictions HTTP appropriées pour votre nom de domaine ou votre environnement de développement.

## Licence et Crédits
Auteur : Aurélien Gérits (Magix CMS)
Copyright : © 2008-2026 Gerits Aurelien https://www.gerits-aurelien.be
Licence : Double licence sous MIT ou GPL Version 3.
