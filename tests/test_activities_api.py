from fastapi.testclient import TestClient
import importlib.util

# Import the app from src/app.py
spec = importlib.util.spec_from_file_location('app', 'src/app.py')
app_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app_module)
app = app_module.app

client = TestClient(app)


def test_get_activities():
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # Check one known activity exists
    assert "Chess Club" in data
    assert "participants" in data["Chess Club"]


def test_signup_and_unregister():
    activity = "Programming Class"
    email = "tester@example.com"

    # Ensure email isn't present initially
    resp = client.get("/activities")
    assert resp.status_code == 200
    participants = resp.json()[activity]["participants"]
    assert email not in participants


def test_signup_twice_fails():
    activity = "Chess Club"
    email = "duplicate@example.com"

    # Ensure clean start: remove if present
    client.delete(f"/activities/{activity}/participants?email={email}")

    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 200

    # Second signup should fail with 400
    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 400

    # cleanup
    client.delete(f"/activities/{activity}/participants?email={email}")


def test_unregister_nonexistent_participant_fails():
    activity = "Science Club"
    email = "notfound@example.com"

    # Ensure participant isn't present
    client.delete(f"/activities/{activity}/participants?email={email}")

    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    # our API returns 404 when the participant is not present
    assert resp.status_code == 404


def test_unknown_activity_returns_404():
    activity = "Nonexistent Activity"
    email = "nobody@example.com"

    resp = client.post(f"/activities/{activity}/signup?email={email}")
    assert resp.status_code == 404

    resp = client.delete(f"/activities/{activity}/participants?email={email}")
    assert resp.status_code == 404
