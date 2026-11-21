import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_admin_panel_and_config_update(client: AsyncClient):
    # Register first user -> becomes platform admin automatically
    reg_res = await client.post("/api/auth/register", json={
        "email": "super_admin@sellerhub.com",
        "password": "admin_password_1",
        "full_name": "Platform Owner"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Verify admin stats
    stats_res = await client.get("/api/admin/stats", headers=headers)
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_users"] >= 1

    # Get platform configuration
    cfg_res = await client.get("/api/admin/config", headers=headers)
    assert cfg_res.status_code == 200
    cfg = cfg_res.json()
    assert "platform_name" in cfg

    # Update platform configuration
    new_cfg = cfg.copy()
    new_cfg["platform_name"] = "SELLER HUB PRO"
    update_res = await client.put("/api/admin/config", json=new_cfg, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["config"]["platform_name"] == "SELLER HUB PRO"
