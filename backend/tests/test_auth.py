import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login(client: AsyncClient):
    # 1. Register
    reg_payload = {
        "email": "test_seller@sellerhub.com",
        "password": "password123",
        "full_name": "Test Seller"
    }
    res = await client.post("/api/auth/register", json=reg_payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test_seller@sellerhub.com"
    token = data["access_token"]

    # 2. Login with same credentials
    login_payload = {
        "email": "test_seller@sellerhub.com",
        "password": "password123"
    }
    login_res = await client.post("/api/auth/login", json=login_payload)
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # 3. Check /me profile endpoint
    headers = {"Authorization": f"Bearer {token}"}
    me_res = await client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["email"] == "test_seller@sellerhub.com"
    assert "email" in me_data["linked_providers"]


@pytest.mark.asyncio
async def test_telegram_login_and_bot_linking(client: AsyncClient):
    # Register/login via telegram widget auth data
    tg_payload = {
        "id": 987654321,
        "first_name": "Alex",
        "last_name": "Hub",
        "username": "alex_hub",
        "auth_date": 1700000000,
        "hash": "test_valid_hash"
    }
    res = await client.post("/api/auth/telegram-login", json=tg_payload)
    assert res.status_code == 200
    token = res.json()["access_token"]

    # Generate one-time Telegram bot link token
    headers = {"Authorization": f"Bearer {token}"}
    bot_token_res = await client.post("/api/auth/telegram-bot-link-token", headers=headers)
    assert bot_token_res.status_code == 200
    link_data = bot_token_res.json()
    assert "deep_link" in link_data
    assert "start=link_" in link_data["deep_link"]
