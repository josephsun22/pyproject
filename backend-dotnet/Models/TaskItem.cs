namespace TaskApi.Models;

/// <summary>
/// Task entity. Named TaskItem to avoid clashing with System.Threading.Tasks.Task.
/// Mirrors the Django tasks.Task model.
/// </summary>
public class TaskItem
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

    public bool Completed { get; set; }

    public DateTime CreatedAt { get; set; }
}
