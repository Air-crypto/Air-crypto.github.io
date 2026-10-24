"""Offline progress-only alternative; never changes the recorded online reward.

Call the scorer only with verified, ordered evaluator frames. This measures the
game's score, not kills or stage completion. It does not prove exploit resistance.
"""

VERSION = "airstriker-progress-v2"
DEFINITION = {
    "version": VERSION,
    "mode": "offline alternative; historical online rewards remain unchanged",
    "score_points_per_reward": 20,
    "score_reward_cap": 50.0,
    "life_loss_penalty": 0.0,
    "game_over_penalty": 0.0,
    "stage_bonus": 0.0,
    "total_bounds": [0.0, 50.0],
    "terminal_rule": {"gameover": 1, "lives": 0},
    "formula": "min(50, max(0, eligible score high-water minus initial score) / 20)",
    "anti_farming": [
        "initial score excluded",
        "one global score high-water across lives and score decreases",
        "terminal event latches; no later score credit",
        "ineligible late frames cannot change rewards or diagnostics",
        "no idle, survival, movement, button, life or stage credit",
    ],
    "rationale": "Removing death penalties removes the scalar advantage of withholding death-animation frames at equal earned score.",
    "limitation": "Bounded arcade-score proxy, not validated kills or stages; score exploits remain possible. Zero-progress inactivity ties zero-progress play.",
}


class AirstrikerProgressRewards:
    def __init__(self, initial):
        self._validate(initial)
        self.initial_score = self.high_score = initial["score"]
        self.last_lives = initial["lives"]
        self.life_losses = 0
        self.terminal = initial["gameover"] == 1 and initial["lives"] == 0
        self.stage = initial.get("stage")
        self.total = 0.0

    @staticmethod
    def _validate(info):
        if not isinstance(info, dict):
            raise ValueError("Evaluator info must be an object")
        for key, limit in (("score", 2**32), ("lives", 2**16), ("gameover", 2**16)):
            if type(info.get(key)) is not int or not 0 <= info[key] < limit:
                raise ValueError("Invalid unsigned evaluator variable: " + key)

    def update(self, info, *, eligible=True):
        self._validate(info)
        if type(eligible) is not bool:
            raise ValueError("Reward eligibility must be boolean")
        previous = self.total
        events = []
        if eligible and not self.terminal:
            if info["score"] > self.high_score:
                events.append({"kind": "score_highwater", "from": self.high_score, "to": info["score"]})
                self.high_score = info["score"]
            lost = max(0, self.last_lives - info["lives"])
            if lost:
                self.life_losses += lost
                events.append({"kind": "life_lost", "count": lost})
            self.last_lives = info["lives"]
            self.stage = info.get("stage")
            if info["gameover"] == 1 and info["lives"] == 0:
                self.terminal = True
                events.append({"kind": "game_over"})
            self.total = round(min(50.0, (self.high_score - self.initial_score) / 20), 10)
        return {
            "version": VERSION,
            "delta": round(self.total - previous, 10),
            "total": self.total,
            "components": {"score_highwater": self.total, "life_losses": 0.0, "game_over": 0.0, "stage": 0.0},
            "events": events,
            "eligible": eligible,
            "stage": self.stage,
            "diagnostics": {"initial_score": self.initial_score, "score_highwater": self.high_score,
                            "life_losses": self.life_losses, "lives": self.last_lives, "terminal": self.terminal},
        }


def score_verified_frames(frames):
    """Score already verified full-frame rows, preserving timing/alignment fields.

This function checks ordering but does not authenticate capture hashes or decide
whether an episode is complete. The capture verifier and caller own those gates.
"""
    scorer = None
    result = []
    for index, row in enumerate(frames):
        if row["frame_index"] != index or row["emulator_frame"] != index:
            raise ValueError("Expected contiguous full-frame trajectory beginning at reset")
        if scorer is None:
            if row["reward"]["eligible"] is not True:
                raise ValueError("Initial frame must be eligible")
            scorer = AirstrikerProgressRewards(row["info"])
        reward = scorer.update(row["info"], eligible=row["reward"]["eligible"])
        result.append({**{key: row.get(key) for key in ("frame_index", "emulator_frame", "sequence", "game_ms", "wall_ms")},
                       "reward": reward})
    if scorer is None:
        raise ValueError("Cannot score an empty trajectory")
    return result
