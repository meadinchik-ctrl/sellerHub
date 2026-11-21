import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_public_store_and_crm_leads(client: AsyncClient):
    # Register seller
    reg_res = await client.post("/api/auth/register", json={
        "email": "public_seller@sellerhub.com",
        "password": "password_public_1",
        "full_name": "Public Store Owner"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    stores_res = await client.get("/api/stores", headers=headers)
    store = stores_res.json()[0]
    headers["X-Store-Id"] = store["id"]

    # Create a published product
    prod_res = await client.post("/api/products", json={
        "name": "Смартфон Pro",
        "price": 49990.0,
        "stock_quantity": 5,
        "is_published": True
    }, headers=headers)
    product_id = prod_res.json()["id"]

    # 1. Access Public Store Endpoint without auth!
    pub_store_res = await client.get(f"/api/public/store/{store['slug']}")
    assert pub_store_res.status_code == 200
    assert pub_store_res.json()["name"] == store["name"]

    # 2. Access Public Products List
    pub_prods_res = await client.get(f"/api/public/store/{store['slug']}/products")
    assert pub_prods_res.status_code == 200
    items = pub_prods_res.json()["items"]
    assert len(items) == 1
    assert items[0]["name"] == "Смартфон Pro"

    # 3. Access Single Product Detail
    detail_res = await client.get(f"/api/public/store/{store['slug']}/products/{product_id}")
    assert detail_res.status_code == 200
    assert "prefilled_message" in detail_res.json()

    # 4. Track Contact Click & Lead
    track_res = await client.post(f"/api/public/store/{store['slug']}/track", json={
        "event_type": "contact_click",
        "product_id": product_id,
        "channel": "telegram",
        "customer_info": {
            "name": "Покупатель Иван",
            "telegram": "ivan_buyer",
            "message": "Хочу купить Смартфон Pro"
        }
    })
    assert track_res.status_code == 200

    # 5. Verify customer appeared in seller's CRM!
    crm_res = await client.get("/api/crm/customers", headers=headers)
    assert crm_res.status_code == 200
    crm_items = crm_res.json()["items"]
    assert len(crm_items) == 1
    assert crm_items[0]["telegram_username"] == "ivan_buyer"
