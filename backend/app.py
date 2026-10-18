import logging
from flask import Flask
from flask_cors import CORS
from flasgger import Swagger

from config import Config
from database import migrate_and_normalize_database
from seed import seed_database

# Import Decentralized Route Blueprints
from routes.system_routes import system_bp
from routes.auth_routes import auth_bp
from routes.flight_routes import flight_bp
from routes.booking_routes import booking_bp
from routes.payment_routes import payment_bp
from routes.admin_routes import admin_bp

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] %(levelname)s in %(module)s: %(message)s")
logger = logging.getLogger("skypulse")

app = Flask(__name__)
app.config["SECRET_KEY"] = Config.JWT_SECRET

# Enable CORS for frontend
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)

# Swagger Configuration
swagger_config = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec_1",
            "route": "/api/docs/apispec_1.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/api/docs",
}
swagger_template = {
    "swagger": "2.0",
    "info": {
        "title": "SkyPulse Airlines API",
        "description": "Decentralized & normalized flight booking, payments, self-service cancellation, and admin operations API.",
        "version": "2.0.0",
    },
    "basePath": "/",
    "schemes": ["http", "https"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "name": "Authorization",
            "in": "header",
            "description": "JWT Authorization header using Bearer scheme. Enter 'Bearer <token>' or '<token>' to authorize protected endpoints.",
        }
    },
}
swagger = Swagger(app, config=swagger_config, template=swagger_template)

# Register Decentralized Blueprints
app.register_blueprint(system_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(flight_bp)
app.register_blueprint(booking_bp)
app.register_blueprint(payment_bp)
app.register_blueprint(admin_bp)

# Run database normalization & seed on initialization
with app.app_context():
    migrate_and_normalize_database()
    seed_database(force=False)

if __name__ == "__main__":
    logger.info("Starting SkyPulse backend on port %d...", Config.PORT)
    app.run(host="0.0.0.0", port=Config.PORT, debug=(Config.FLASK_ENV == "development"))
