# Maquette YARO

Maquette commerciale pour presenter aux clients un site institutionnel complet
avec espace admin prive.

## Ce que la maquette montre

- Site public premium et mobile-first.
- Contenu administrable via `data.json` et l'espace admin.
- Formulaires de contact, demandes, CRM, newsletter et fichiers.
- Login admin, roles, sessions, logs, sauvegardes et securite.
- Deploiement possible sur o2switch, Railway ou VPS Python.

## Lancer en local

```bash
cp .env.demo .env
python3 -m pip install -r requirements.txt
python3 server.py
```

Puis ouvrir :

- Site public : `http://127.0.0.1:8080/`
- Admin : `http://127.0.0.1:8080/espace-prive-maquette-yaro-2026`

Identifiants demo :

- utilisateur : `admin`
- mot de passe : `maquette2026`

## Avant de vendre a un client

1. Dupliquer ce repo.
2. Remplacer les textes et photos dans `data.json` et `images/`.
3. Creer un vrai `.env` avec mot de passe admin fort, base MySQL et domaine.
4. Changer `ADMIN_SECRET_PATH`.
5. Tester site public, admin, formulaires, upload, sauvegarde et mobile.

## Tests

```bash
YARO_PASS=maquette2026 python3 tests/test_server.py
```

