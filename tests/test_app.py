from fastapi.testclient import TestClient
from src.app import app, activities
import pytest

client = TestClient(app)

@pytest.fixture(autouse=True)
def reset_activities():
    # Make a shallow copy of initial participants so tests are isolated
    original = {
        name: data.get("participants", []).copy()
        for name, data in activities.items()
    }
    yield
    # restore
    for name, parts in original.items():
        activities[name]["participants"] = parts


def test_get_activities():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert "Chess Club" in data
    assert isinstance(data["Chess Club"]["participants"], list)


def test_signup_and_unregister_flow():
    activity = "Chess Club"
    email = "pytest_user@example.com"

    # ensure not already present
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # signup
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert email in activities[activity]["participants"]

    # duplicate signup should return 400
    res2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert res2.status_code == 400

    # unregister
    res3 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res3.status_code == 200
    assert email not in activities[activity]["participants"]

    # unregistering again should return 404
    res4 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res4.status_code == 404


def test_signup_activity_not_found():
    res = client.post("/activities/NonExistent/signup?email=a@b.com")
    assert res.status_code == 404


def test_unregister_activity_not_found():
    res = client.delete("/activities/NoActivity/participants?email=x@x.com")
    assert res.status_code == 404
