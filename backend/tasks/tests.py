from django.test import TestCase
from rest_framework.test import APIClient


class TaskApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def create_task(self, title="Write tests"):
        response = self.client.post("/api/tasks/", {"title": title}, format="json")
        self.assertEqual(response.status_code, 201)
        return response

    def test_create_task_returns_persisted_task(self):
        response = self.create_task("Ship the starter")

        self.assertEqual(response.data["title"], "Ship the starter")
        self.assertFalse(response.data["completed"])
        self.assertIsInstance(response.data["id"], int)
        self.assertIn("created_at", response.data)

        listed = self.client.get("/api/tasks/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual([task["id"] for task in listed.data], [response.data["id"]])

    def test_list_orders_newest_tasks_first(self):
        first = self.create_task("First")
        second = self.create_task("Second")

        response = self.client.get("/api/tasks/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            [task["id"] for task in response.data],
            [second.data["id"], first.data["id"]],
        )

    def test_create_rejects_blank_and_whitespace_titles(self):
        for title in ("", "   "):
            with self.subTest(title=title):
                response = self.client.post(
                    "/api/tasks/", {"title": title}, format="json"
                )

                self.assertEqual(response.status_code, 400)
                self.assertIn("title", response.data)

    def test_create_rejects_titles_longer_than_200_characters(self):
        response = self.client.post(
            "/api/tasks/", {"title": "x" * 201}, format="json"
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("title", response.data)

    def test_patch_updates_completion_without_changing_title(self):
        created = self.create_task("Toggle me")

        response = self.client.patch(
            f"/api/tasks/{created.data['id']}/",
            {"completed": True},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["completed"])
        self.assertEqual(response.data["title"], "Toggle me")

    def test_delete_removes_task(self):
        created = self.create_task("Delete me")

        response = self.client.delete(f"/api/tasks/{created.data['id']}/")

        self.assertEqual(response.status_code, 204)
        listed = self.client.get("/api/tasks/")
        self.assertEqual(listed.status_code, 200)
        self.assertEqual(listed.data, [])

    def test_missing_task_returns_json_404(self):
        response = self.client.get("/api/tasks/999/")

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.headers["Content-Type"], "application/json")
        self.assertIn("detail", response.json())

