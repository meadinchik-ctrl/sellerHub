import io
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_csv_import_and_export(client: AsyncClient):
    # Register seller
    reg_res = await client.post("/api/auth/register", json={
        "email": "import_seller@sellerhub.com",
        "password": "password_import_1",
        "full_name": "Import Seller"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    stores_res = await client.get("/api/stores", headers=headers)
    store = stores_res.json()[0]
    headers["X-Store-Id"] = store["id"]

    # 1. Prepare sample CSV content
    csv_content = (
        "Артикул,Наименование товара,Цена,Остаток,Категория,Описание\n"
        "TSHIRT-BLK,Футболка Черная,1500,20,Одежда,Классическая хлопковая футболка\n"
        "CAP-RED,Кепка Красная,900,15,Аксессуары,Бейсболка с логотипом\n"
    ).encode("utf-8")

    files = {"file": ("catalog.csv", io.BytesIO(csv_content), "text/csv")}
    analyze_res = await client.post("/api/import-export/analyze", files=files, headers=headers)
    assert analyze_res.status_code == 200, analyze_res.text
    analysis = analyze_res.json()
    assert analysis["total_rows"] == 2
    assert "Наименование товара" in analysis["columns"]

    # 2. Execute import
    mappings = {
        "Артикул": "sku",
        "Наименование товара": "name",
        "Цена": "price",
        "Остаток": "stock_quantity",
        "Категория": "category",
        "Описание": "description"
    }
    exec_res = await client.post("/api/import-export/execute", json={
        "file_id": analysis["file_id"],
        "column_mappings": mappings,
        "duplicate_strategy": "update"
    }, headers=headers)
    assert exec_res.status_code == 200, exec_res.text
    job = exec_res.json()
    assert job["created_rows"] == 2
    assert job["status"] == "completed"

    # 3. Verify products in database
    prods_res = await client.get("/api/products", headers=headers)
    items = prods_res.json()["items"]
    assert len(items) == 2

    # 4. Test Export
    export_res = await client.get("/api/import-export/export?format=csv", headers=headers)
    assert export_res.status_code == 200
    assert "Футболка Черная" in export_res.text
