using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskApi.Data;
using TaskApi.Dtos;
using TaskApi.Models;

namespace TaskApi.Controllers;

[ApiController]
[Route("api/tasks")]
public class TasksController : ControllerBase
{
    private const int TitleMaxLength = 200;

    private readonly AppDbContext _db;

    public TasksController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/tasks/
    [HttpGet]
    public async Task<ActionResult<IEnumerable<TaskResponseDto>>> List()
    {
        var tasks = await _db.Tasks
            .OrderByDescending(t => t.CreatedAt)
            .ThenByDescending(t => t.Id)
            .ToListAsync(); // breakpoint here

        return Ok(tasks.Select(TaskResponseDto.FromEntity));
    }

    // GET /api/tasks/{id}/
    [HttpGet("{id:int}")]
    public async Task<ActionResult<TaskResponseDto>> Retrieve(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null)
        {
            return NotFoundDetail();
        }

        return Ok(TaskResponseDto.FromEntity(task));
    }

    // POST /api/tasks/
    [HttpPost]
    public async Task<ActionResult<TaskResponseDto>> Create([FromBody] TaskCreateDto dto)
    {
        if (!TryValidateTitle(dto.Title, required: true, out var title, out var error))
        {
            return FieldError("title", error);
        }

        var task = new TaskItem
        {
            Title = title,
            Completed = dto.Completed ?? false,
            CreatedAt = DateTime.UtcNow,
        };

        _db.Tasks.Add(task);
        await _db.SaveChangesAsync();

        var body = TaskResponseDto.FromEntity(task);
        return CreatedAtAction(nameof(Retrieve), new { id = task.Id }, body);
    }

    // PATCH /api/tasks/{id}/
    [HttpPatch("{id:int}")]
    public async Task<ActionResult<TaskResponseDto>> Patch(int id, [FromBody] TaskUpdateDto dto)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null)
        {
            return NotFoundDetail();
        }

        if (dto.Title is not null)
        {
            if (!TryValidateTitle(dto.Title, required: true, out var title, out var error))
            {
                return FieldError("title", error);
            }

            task.Title = title;
        }

        if (dto.Completed is not null)
        {
            task.Completed = dto.Completed.Value;
        }

        await _db.SaveChangesAsync();

        return Ok(TaskResponseDto.FromEntity(task));
    }

    // DELETE /api/tasks/{id}/
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var task = await _db.Tasks.FindAsync(id);
        if (task is null)
        {
            return NotFoundDetail();
        }

        _db.Tasks.Remove(task);
        await _db.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Validates a title using Django REST Framework CharField semantics:
    /// whitespace is trimmed, then blank and max-length are enforced.
    /// </summary>
    private static bool TryValidateTitle(string? value, bool required, out string title, out string error)
    {
        title = string.Empty;
        error = string.Empty;

        if (value is null)
        {
            if (required)
            {
                error = "This field is required.";
                return false;
            }

            return true;
        }

        var trimmed = value.Trim();
        if (trimmed.Length == 0)
        {
            error = "This field may not be blank.";
            return false;
        }

        if (trimmed.Length > TitleMaxLength)
        {
            error = $"Ensure this field has no more than {TitleMaxLength} characters.";
            return false;
        }

        title = trimmed;
        return true;
    }

    private ObjectResult FieldError(string field, string message)
    {
        var payload = new Dictionary<string, string[]> { [field] = new[] { message } };
        return new ObjectResult(payload) { StatusCode = StatusCodes.Status400BadRequest };
    }

    private ObjectResult NotFoundDetail()
    {
        var payload = new Dictionary<string, string> { ["detail"] = "Not found." };
        return new ObjectResult(payload) { StatusCode = StatusCodes.Status404NotFound };
    }
}
