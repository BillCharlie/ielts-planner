package com.bill.ieltsplanner;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    static final String PREFS = "planner";
    static final String KEY_BASE_URL = "baseUrl";
    static final String KEY_TOKEN = "token";

    private EditText baseUrlInput;
    private EditText passwordInput;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        SharedPreferences prefs = getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        int pad = dp(20);
        root.setPadding(pad, pad, pad, pad);
        root.setBackgroundColor(0xFFF5F7F6);

        TextView title = new TextView(this);
        title.setText("IELTS Planner Widget");
        title.setTextSize(24);
        title.setTextColor(0xFF18211F);
        title.setTypeface(null, 1);
        root.addView(title);

        baseUrlInput = new EditText(this);
        baseUrlInput.setHint("Railway URL, e.g. https://xxx.up.railway.app");
        baseUrlInput.setSingleLine(true);
        baseUrlInput.setText(prefs.getString(KEY_BASE_URL, ""));
        root.addView(baseUrlInput, fieldParams());

        passwordInput = new EditText(this);
        passwordInput.setHint("Password");
        passwordInput.setSingleLine(true);
        passwordInput.setText("Bill");
        root.addView(passwordInput, fieldParams());

        Button loginButton = new Button(this);
        loginButton.setText("Login and update widget");
        root.addView(loginButton, fieldParams());

        Button refreshButton = new Button(this);
        refreshButton.setText("Refresh widget");
        root.addView(refreshButton, fieldParams());

        statusText = new TextView(this);
        statusText.setTextColor(0xFF60706C);
        root.addView(statusText, fieldParams());

        loginButton.setOnClickListener(view -> login(prefs));
        refreshButton.setOnClickListener(view -> {
            updateWidgets();
            statusText.setText("Widget refresh requested.");
        });

        setContentView(root);
    }

    private void login(SharedPreferences prefs) {
        statusText.setText("Connecting...");
        new Thread(() -> {
            try {
                String baseUrl = cleanBaseUrl(baseUrlInput.getText().toString());
                String password = passwordInput.getText().toString();
                URL url = new URL(baseUrl + "/api/login");
                HttpURLConnection connection = (HttpURLConnection) url.openConnection();
                connection.setRequestMethod("POST");
                connection.setRequestProperty("Content-Type", "application/json");
                connection.setDoOutput(true);
                String body = "{\"password\":\"" + password.replace("\"", "\\\"") + "\"}";
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(body.getBytes(StandardCharsets.UTF_8));
                }
                if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
                    throw new IllegalStateException("Login failed: " + connection.getResponseCode());
                }
                JSONObject json = new JSONObject(readString(connection.getInputStream()));
                prefs.edit()
                    .putString(KEY_BASE_URL, baseUrl)
                    .putString(KEY_TOKEN, json.getString("token"))
                    .apply();
                runOnUiThread(() -> {
                    statusText.setText("Login saved. Add the widget to your home screen.");
                    updateWidgets();
                });
            } catch (Exception error) {
                runOnUiThread(() -> statusText.setText("Login failed: " + error.getMessage()));
            }
        }).start();
    }

    private void updateWidgets() {
        AppWidgetManager manager = AppWidgetManager.getInstance(this);
        int[] ids = manager.getAppWidgetIds(new ComponentName(this, PlannerWidgetProvider.class));
        PlannerWidgetProvider.updateWidgets(this, manager, ids);
    }

    private static String cleanBaseUrl(String value) {
        String cleaned = value == null ? "" : value.trim();
        while (cleaned.endsWith("/")) cleaned = cleaned.substring(0, cleaned.length() - 1);
        return cleaned;
    }

    private static String readString(InputStream inputStream) throws Exception {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[4096];
        int count;
        while ((count = inputStream.read(buffer)) != -1) {
            output.write(buffer, 0, count);
        }
        return output.toString(StandardCharsets.UTF_8.name());
    }

    private LinearLayout.LayoutParams fieldParams() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        );
        params.setMargins(0, dp(14), 0, 0);
        return params;
    }

    private int dp(int value) {
        return (int) (value * getResources().getDisplayMetrics().density + 0.5f);
    }
}
