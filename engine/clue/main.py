import typer

app = typer.Typer(
    name="clue",
    help="OpenClue — Terminal-Based Escape Room Engine",
)


@app.command()
def play(scenario: str = typer.Argument(..., help="Path to encrypted scenario file (.dat)")):
    """Play an escape room scenario."""
    typer.echo(f"Loading scenario: {scenario}")
    # TODO: implement


@app.command()
def build(source: str = typer.Argument(..., help="Path to scenario JSON file")):
    """Build and encrypt a scenario JSON into a .dat file."""
    typer.echo(f"Building scenario: {source}")
    # TODO: implement


@app.command()
def verify(source: str = typer.Argument(..., help="Path to scenario JSON file")):
    """Verify scenario JSON for schema and logic errors."""
    typer.echo(f"Verifying scenario: {source}")
    # TODO: implement


if __name__ == "__main__":
    app()
