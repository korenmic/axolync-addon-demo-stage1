# Backlog Tasks

- [x] Add a LyricFlow demo adapter checkbox that can return untimed/plain lyrics for paragraph synthetic timing tests.
  - Add an adapter-owned boolean option such as `return_untimed_lyrics` to the Stage 1 demo LyricFlow adapter settings surface.
  - When enabled, the demo adapter should return a plain/untimed lyric payload shape suitable for exercising browser paragraph synthetic timing, not pre-timed line/word units.
  - Keep the default demo behavior timed so existing demo flows remain stable unless the checkbox is explicitly selected.
  - Add focused proof that toggling the option makes the demo adapter produce an untimed-origin result that the browser fallback can detect.
