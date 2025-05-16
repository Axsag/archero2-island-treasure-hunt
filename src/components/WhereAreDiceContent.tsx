'use client'
import { ChangeEvent, useCallback, useRef, useState } from "react";
import { IntegerInput } from "./IntegerInput";
import { quests } from "@/utils/constants";
import { Quest } from "@/utils/types";
import styles from './Row.module.css';
import { basePath } from "@/utils/constants";


type ProgressBarProps = {
  percentDone: number;
}
const ProgressBar = (props: ProgressBarProps) => {
  const { percentDone } = props;

  return (
    <div className="w-full max-w-40 h-[24px] bg-gray-300 dark:bg-gray-400 rounded-sm overflow-hidden" role="progressbar" aria-valuenow={percentDone} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full rounded-sm overflow-hidden bg-blue-400 dark:bg-blue-500 transition duration-500"  style={{ width: `${percentDone}%` }} />
    </div>
  )
}

type RowProps = {
  quest: Quest;
  onNumDiceChange?: (key: string, diceEarned: number, diceLeft: number) => void;
}
const Row = (props: RowProps) => {
    const { quest, onNumDiceChange } = props;
    const [includeRow, setIncludeRow] = useState(!quest.optional);
    const [numBreakpointsMet, setNumBreakpointsMet] = useState(0);
    const totalNumDice = quest.breakpoints[1].reduce((prev, current) => prev + current, 0);
    const numDiceLeft = useRef(totalNumDice);

    const numBreakpoints = quest.breakpoints[0].length;

    const handleCheckboxChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const isChecked = e.target.checked;
            setIncludeRow(isChecked);

            if (onNumDiceChange) {
                onNumDiceChange(quest.name, isChecked ? totalNumDice - numDiceLeft.current : 0, isChecked ? numDiceLeft.current : 0);
            }
        },
        [quest.name, onNumDiceChange, totalNumDice]
    );

    const handleProgressChange = useCallback(
        (newValue: number) => {
            let numBreakpointsMet = quest.breakpoints[0].findIndex(bp => bp > newValue);
            if (numBreakpointsMet === -1) {
                numBreakpointsMet = numBreakpoints;
            }
            setNumBreakpointsMet(numBreakpointsMet);

            const breakpointsLeft = quest.breakpoints[1].slice(numBreakpointsMet);
            numDiceLeft.current = breakpointsLeft.length === 0 ? 0 : breakpointsLeft.reduce((prev, current) => prev + current, 0);

            if (includeRow && onNumDiceChange) {
                onNumDiceChange(quest.name, totalNumDice - numDiceLeft.current, numDiceLeft.current);
            }
        },
        [includeRow, numBreakpoints, quest, onNumDiceChange, totalNumDice]
    );

    // Tooltip content for breakpoints
    const breakpointsTooltip = `Breakpoints: ${quest.breakpoints[0].join(", ")}`;

    return (
        <div className={styles.questCard}>
            {/* Top: title and input / max */}
            <div className={styles.top}>
                <div className={styles.title}>{quest.name}</div>
                <input
                    type="number"
                    min={0}
                    max={totalNumDice}
                    placeholder={quest.placeholderText}
                    onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                    value={totalNumDice - numDiceLeft.current}
                    className={styles.numberInput}
                />
                <div className={styles.max}>/ {totalNumDice}</div>
            </div>

            {/* Content: breakpoints with background image and labels */}
            <div className={styles.content}>
                {quest.breakpoints[0].map((bp, index) => {
                    const reached = numBreakpointsMet > index;
                    const rewardImage = `${basePath}/dice.png`; // Example, customize as needed
                    const rewardVal = reached ? '✔' : '5';

                    return (
                        <div
                            key={bp}
                            className={styles.reward}
                            style={{ backgroundImage: `url(${rewardImage})` }}
                            title={`Breakpoint ${bp} - ${reached ? 'Reached' : 'Not reached'}`}
                            aria-label={`Breakpoint ${bp} - ${reached ? 'Reached' : 'Not reached'}`}
                        >
                            <div className={`${styles.small} ${styles.above}`}>{bp}</div>
                            <div className={`${styles.small} ${styles.cornerRight}`}>{rewardVal}</div>
                        </div>
                    );
                })}
            </div>

            {/* Optional checkbox */}
            {quest.optional && (
                <div className={styles.optionalCheckboxWrapper}>
                    <label className={styles.checkboxLabel}>
                        Include in Total?
                        <input
                            name="includeCheckbox"
                            type="checkbox"
                            checked={includeRow}
                            onChange={handleCheckboxChange}
                            className={styles.checkboxInput}
                        />
                    </label>
                </div>
            )}
        </div>
    );
};

export default function WhereAreDiceContent() {
  const [nonRollingDice, setNonRollingDice] = useState(new Map<string, [number,number]>(
    quests
      .filter(quest => !quest.fromRolling && !quest.optional)
      .map(quest => ([quest.name, [0, quest.breakpoints[1].reduce((prev, current) => prev + current)]]))
  ));

  const onNumDiceChange = (key: string, diceEarned: number, diceLeft: number) => {
    setNonRollingDice(oldMap => {
      const newMap = new Map(oldMap);
      newMap.set(key, [diceEarned, diceLeft]);
      return newMap;
    })
  }

  const totalDice = [...nonRollingDice.values()].reduce((prev, current) => [prev[0] + current[0], prev[1] + current[1]]);
  return (
    <div>
      <div className="pb-8 ">
        <h3 className="text-lg font-semibold">Quests that you can complete without rolling</h3>
        <p className="pb-2">{`These quests affects your Points per Initial Dice (PPID) as it adds to your '# of Starting Dice'.`}</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-2 gap-y-4 border-b border-dashed border-gray-600 pb-2">
          {quests.filter(quest => !quest.fromRolling).map((quest, index) => (
            <Row key={index} quest={quest} onNumDiceChange={onNumDiceChange}/>
          ))}
        </div>
        <div className="flex gap-2 font-bold text-xl">
          <p className="w-[200px]">{`Dice Earned: ${totalDice[0]}`}</p>
          <p>{`Dice Left: ${totalDice[1]}`}</p>
        </div>
      </div>
      <div>
        <h3 className="text-lg font-semibold">Quests that you complete while rolling</h3>
        <p className="pb-2">These quests give you free dice from just rolling.</p>
        <ul className="list-disc ms-5">
          {quests.filter(quest => quest.fromRolling).map((quest, index) => (
            <li key={index}>
              <strong>{quest.name} Quest</strong>: {quest.breakpoints[1].reduce((prev, current) => prev + current)} dice available with breakpoints ranging from {quest.breakpoints[0][0]} to {quest.breakpoints[0][quest.breakpoints[0].length-1]}
            </li>
          ))}
          <li><strong>Rolling Around Board</strong>: There are a few tiles on the board that gives free dice when you land on them</li>
        </ul>
      </div>
    </div>
  )
}