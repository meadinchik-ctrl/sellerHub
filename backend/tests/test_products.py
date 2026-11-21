import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_product_lifecycle_and_variants(client: AsyncClient):
    # Register seller
    reg_res = await client.post("/api/auth/register", json={
        "email": "prod_seller@sellerhub.com",
        "password": "secret_password_1",
        "full_name": "Product Seller"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Get auto-created store
    stores_res = await client.get("/api/stores", headers=headers)
    stores = stores_res.json()
    assert len(stores) > 0
    store_id = stores[0]["id"]
    headers["X-Store-Id"] = store_id

    # Create category
    cat_res = await client.post("/api/categories", json={
        "name": "Одежда",
        "description": "Стильная одежда"
    }, headers=headers)
    assert cat_res.status_code == 200
    cat_id = cat_res.json()["id"]

    # Create product with variants and attributes
    prod_payload = {
        "name": "Худи Теплый",
        "sku": "HOOD-001",
        "category_id": cat_id,
        "price": 3500.0,
        "old_price": 4500.0,
        "currency": "RUB",
        "stock_quantity": 10,
        "is_published": True,
        "description": "Плотный хлопок 100%",
        "images": [
            {"image_url": "https://example.com/hoodie.jpg", "is_cover": True, "sort_order": 0}
        ],
        "variants": [
            {"title": "Размер M", "sku": "HOOD-001-M", "price": 3500.0, "stock_quantity": 5},
            {"title": "Размер L", "sku": "HOOD-001-L", "price": 3500.0, "stock_quantity": 5}
        ],
        "attributes": [
            {"name": "Состав", "type": "text", "value_text": "Хлопок 100%"}
        ]
    }
    create_res = await client.post("/api/products", json=prod_payload, headers=headers)
    assert create_res.status_code == 200, create_res.text
    prod = create_res.json()
    assert prod["name"] == "Худи Теплый"
    assert len(prod["variants"]) == 2
    assert len(prod["attributes"]) == 1
    prod_id = prod["id"]

    # Duplicate product
    dup_res = await client.post(f"/api/products/{prod_id}/duplicate", headers=headers)
    assert dup_res.status_code == 200
    dup_prod = dup_res.json()
    assert "Копия" in dup_prod["name"]
    assert dup_prod["is_published"] == False

    # Bulk action: publish duplicate
    bulk_res = await client.post("/api/products/bulk", json={
        "product_ids": [dup_prod["id"]],
        "action": "publish"
    }, headers=headers)
    assert bulk_res.status_code == 200
    assert bulk_res.json()["affected"] == 1
