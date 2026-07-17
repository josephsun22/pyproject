namespace TaskApi.Dtos;

/// <summary>
/// Payload for partial (PATCH) updates. Nullable members distinguish
/// "field omitted" from "field explicitly set", matching DRF partial=True.
/// </summary>
public class TaskUpdateDto
{
    public string? Title { get; set; }

    public bool? Completed { get; set; }
}
