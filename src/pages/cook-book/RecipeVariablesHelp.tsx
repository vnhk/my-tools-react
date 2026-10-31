import React, {useState} from 'react'
import styles from './RecipeVariablesHelp.module.css'

export const RecipeVariablesHelp: React.FC = () => {
    const [open, setOpen] = useState(false)

    return (
        <div className={styles.helpContainer}>
            <div className={styles.helpHeader} onClick={() => setOpen(!open)}>
                <div className={styles.headerTitle}>
                    <span className={styles.infoIcon}>💡</span>
                    <span>How Dynamic Ingredients & Servings Scaling Work</span>
                </div>
                <button
                    type="button"
                    className={styles.toggleBtn}
                    aria-expanded={open}
                >
                    {open ? 'Hide Guide ▲' : 'Show Guide ▼'}
                </button>
            </div>

            {open && (
                <div className={styles.helpBody}>
                    <div className={styles.section}>
                        <h4>1. Dynamic Servings Scaling (Up & Down)</h4>
                        <p>
                            Recipes typically have a default base yield (e.g., 2–6 servings). Use the
                            <strong> Servings & Quantity Scaler</strong> above to adjust portions up or down (e.g., scaling down to 1 serving or up to 8).
                        </p>
                        <p className={styles.highlight}>
                            <strong>Note:</strong> Scaling is performed <em>in-memory for your active cooking session</em>. It dynamically recalculates all amounts without modifying or overwriting the original recipe in the database.
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h4>2. Ingredient Variables in Instructions</h4>
                        <p>
                            Instead of hardcoding static quantities (like &quot;400 g of potatoes&quot;) into the cooking steps,
                            you can reference any ingredient using variable placeholders in curly brackets:
                        </p>
                        <div className={styles.codeExample}>
                            <code>Dodaj &#123;ingredient1&#125; obranych i pokrojonych w kostkę ziemniaków oraz &#123;ingredient2&#125; soli.</code>
                        </div>
                        <p>
                            When reading the recipe, each variable is automatically replaced with its
                            <strong> dynamically scaled quantity and unit</strong> (for example: &quot;400 g&quot; at 1x scale, &quot;200 g&quot; at 0.5x scale, or &quot;800 g&quot; at 2x scale).
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h4>3. Supported Variable Syntax</h4>
                        <table className={styles.syntaxTable}>
                            <thead>
                                <tr>
                                    <th>Variable Format</th>
                                    <th>Description</th>
                                    <th>Example Output (at 2x)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td><code>&#123;name&#125;</code></td>
                                    <td>Scaled quantity + unit (default)</td>
                                    <td><strong>400 g</strong> / <strong>2 tbsp</strong></td>
                                </tr>
                                <tr>
                                    <td><code>&#123;name.qty&#125;</code></td>
                                    <td>Scaled numeric quantity only</td>
                                    <td><strong>400</strong></td>
                                </tr>
                                <tr>
                                    <td><code>&#123;name.name&#125;</code></td>
                                    <td>Ingredient name</td>
                                    <td><strong>Wheat Flour</strong></td>
                                </tr>
                                <tr>
                                    <td><code>&#123;name.full&#125;</code></td>
                                    <td>Full format: quantity + unit + name</td>
                                    <td><strong>400 g Wheat Flour</strong></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.section}>
                        <h4>4. Custom Variable Names</h4>
                        <p>
                            Each ingredient has a default alias based on its position (<code>&#123;ingredient1&#125;</code>, <code>&#123;ingredient2&#125;</code>, etc.).
                            You can also assign custom variable names such as <code>&#123;flour&#125;</code>, <code>&#123;butter&#125;</code>, or <code>&#123;sauce&#125;</code>
                            in the ingredient dialog. Both the custom name and the indexed alias remain active!
                        </p>
                    </div>

                    <div className={styles.section}>
                        <h4>5. Automatic AI HTML Scraper Integration</h4>
                        <p>
                            When you import a recipe from a webpage HTML using the built-in AI Scraper, the AI
                            automatically detects ingredient amounts in the instructions, matches them with the ingredients list,
                            and places variable tags (<code>&#123;ingredient1&#125;</code>, <code>&#123;ingredient2&#125;</code>...) into the generated steps so the recipe is immediately scalable.
                        </p>
                    </div>
                </div>
            )}
        </div>
    )
}
