using TaskApi.Models;

namespace TaskApi.Dtos;

/// <summary>
/// Serialized task shape returned to clients: { id, title, completed, created_at }.
/// </summary>
public record TaskResponseDto(int Id, string Title, bool Completed, DateTime CreatedAt)
{
    public static TaskResponseDto FromEntity(TaskItem task) =>
        new(task.Id, task.Title, task.Completed, task.CreatedAt);
}
