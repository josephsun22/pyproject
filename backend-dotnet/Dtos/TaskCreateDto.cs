namespace TaskApi.Dtos;

/// <summary>
/// Payload for creating a task. Title is validated manually to reproduce the
/// Django REST Framework error shape and messages.
/// </summary>
public class TaskCreateDto
{
    public string? Title { get; set; }

    public bool? Completed { get; set; }
}
