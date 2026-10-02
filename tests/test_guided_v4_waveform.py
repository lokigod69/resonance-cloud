"""Offline signal and data-contract tests for promotional audio candidates."""
import array
import copy
import math
import unittest
from scripts import analyze_guided_v4_cuts as cuts


class CutsTests(unittest.TestCase):
    def waveform(self, gap=None):
        return array.array("h", (0 if gap and gap[0] <= i / cuts.RATE < gap[1]
                                else int(6000 * math.sin(2 * math.pi * 240 * i / cuts.RATE))
                                for i in range(cuts.RATE)))

    def alignment(self, text="Go!", starts=None):
        return {"characters": list(text), "character_start_times_seconds": starts or [0, .1, .2],
                "character_end_times_seconds": [999, -55, "broken-end-values-ignored"]}

    def test_non_silent_boundary_rejected(self):
        self.assertEqual(cuts.quiet_boundary(self.waveform(), .2, .8)["status"], cuts.REVIEW)

    def test_silent_gap_retains_pause(self):
        result = cuts.quiet_boundary(self.waveform((.4, .6)), .2, .8)
        self.assertEqual(result["status"], cuts.SAFE)
        self.assertEqual(result["cutSample"], 8000)
        self.assertGreaterEqual(min(result["cutSample"] - result["quietSamples"][0],
                                    result["quietSamples"][1] - result["cutSample"]), 800)

    def test_short_gap_rejected(self):
        self.assertEqual(cuts.quiet_boundary(self.waveform((.4, .46)), .2, .8)["status"], cuts.REVIEW)

    def test_peak_spike_breaks_gap(self):
        samples = self.waveform((.4, .55))
        samples[7600] = 4000
        self.assertEqual(cuts.quiet_boundary(samples, .2, .8)["status"], cuts.REVIEW)

    def test_two_qualifying_gaps_are_ambiguous(self):
        samples = self.waveform((.25, .4))
        samples[8800:11200] = array.array("h", [0] * 2400)
        result = cuts.quiet_boundary(samples, .2, .8)
        self.assertEqual(result["status"], cuts.REVIEW)
        self.assertEqual(result["qualifiedQuietRuns"], 2)

    def test_stale_text_rejected(self):
        with self.assertRaisesRegex(ValueError, "Stale"):
            cuts.validate_alignment(self.alignment(), "No!", 1)

    def test_malformed_times_rejected(self):
        for times in ([0, .2], [0, .2, .1], [0, float("nan"), .2], [0, .1, float("inf")],
                      [0, -.1, .2], [0, True, .2], [0, "0.1", .2]):
            with self.subTest(times=times), self.assertRaises(ValueError):
                cuts.validate_alignment(self.alignment(starts=times), "Go!", 1)
        bad = self.alignment()
        bad["characters"] = ["Go", "!"]
        with self.assertRaises(ValueError):
            cuts.validate_alignment(bad, "Go!", 1)

    def test_punctuation_overrun_recorded_without_clamp(self):
        starts, overruns = cuts.validate_alignment(self.alignment(starts=[0, .8, 1.109]), "Go!", 1)
        self.assertEqual(starts[-1], 1.109)
        self.assertAlmostEqual(overruns[0]["overflowSeconds"], .109)
        for text, times in (("Go!", [0, 1.01, 1.1]), ("Go!", [0, .8, 1.16]), ("G!o", [0, .8, 1.01])):
            with self.subTest(text=text), self.assertRaises(ValueError):
                cuts.validate_alignment(self.alignment(text, times), text, 1)

    def test_source_coordinates_and_stale_segment(self):
        text = "Go!"
        coords = [{"lessonId": "example", "playbackSurface": "corePhrase", "playbackSurfaceKey": "__self"}]
        segment = {"text": text, "entryId": "example", "textSha256": cuts.digest(text.encode()),
                   "textStartCodePoint": 0, "textEndCodePoint": 3, "textStartIndex": 0, "textEndIndex": 3,
                   "sourceCoordinates": coords}
        data = {"batches": [{"targetLanguage": "English", "kind": "utterances", "level": "A1",
                            "batchId": "test", "text": text, "textSha256": cuts.digest(text.encode()), "segments": [segment]}]}
        self.assertEqual(cuts.source_segments(data, "English")[1][0]["sourceCoordinates"], coords)
        receipt = {"alignments": {"alignment": self.alignment()}, "dialogue": [{"text": text}]}
        manifest = cuts.make_manifest(data, receipt, self.waveform(), "English")
        self.assertEqual(manifest["summary"]["boundaryReviewRequired"], 1)
        self.assertEqual(manifest["summary"]["listeningPending"], 1)
        self.assertIs(manifest["phrases"][0]["listeningRequired"], True)
        self.assertEqual(manifest["phrases"][0]["startSample"], 0)
        self.assertEqual(manifest["phrases"][0]["endSample"], cuts.RATE)
        self.assertEqual(manifest["phrases"][0]["sourceCoordinates"], coords)
        receipt["dialogue"][0]["text"] = "No!"
        with self.assertRaisesRegex(ValueError, "Receipt dialogue"):
            cuts.make_manifest(data, receipt, self.waveform(), "English")
        stale = copy.deepcopy(data)
        stale["batches"][0]["segments"][0]["textEndCodePoint"] = 4
        with self.assertRaises(ValueError):
            cuts.source_segments(stale, "English")


if __name__ == "__main__":
    unittest.main()
