package com.bill.ieltsplanner;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

public class PlannerWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        updateWidgets(context, appWidgetManager, appWidgetIds);
    }

    static void updateWidgets(Context context, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            showLoading(context, manager, id);
        }
        new Thread(() -> {
            WidgetData data = fetchToday(context);
            for (int id : ids) {
                RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_planner);
                views.setTextViewText(R.id.widgetTitle, data.title);
                views.setTextViewText(R.id.widgetProject, data.project);
                views.setTextViewText(R.id.widgetItems, data.items);
                Intent intent = new Intent(context, MainActivity.class);
                PendingIntent pendingIntent = PendingIntent.getActivity(
                    context,
                    0,
                    intent,
                    PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
                );
                views.setOnClickPendingIntent(R.id.widgetRoot, pendingIntent);
                manager.updateAppWidget(id, views);
            }
        }).start();
    }

    private static void showLoading(Context context, AppWidgetManager manager, int id) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_planner);
        views.setTextViewText(R.id.widgetTitle, "IELTS Planner");
        views.setTextViewText(R.id.widgetProject, "Updating...");
        views.setTextViewText(R.id.widgetItems, "");
        manager.updateAppWidget(id, views);
    }

    private static WidgetData fetchToday(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(MainActivity.PREFS, Context.MODE_PRIVATE);
        String baseUrl = prefs.getString(MainActivity.KEY_BASE_URL, "");
        String token = prefs.getString(MainActivity.KEY_TOKEN, "");
        if (baseUrl.isEmpty() || token.isEmpty()) {
            return new WidgetData("IELTS Planner", "Open app to login", "Railway URL + Bill password needed.");
        }
        try {
            String date = LocalDate.now().toString();
            URL url = new URL(baseUrl + "/api/widget/today?date=" + date);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            connection.setRequestProperty("Authorization", "Bearer " + token);
            if (connection.getResponseCode() < 200 || connection.getResponseCode() >= 300) {
                throw new IllegalStateException("HTTP " + connection.getResponseCode());
            }
            JSONObject json = new JSONObject(readString(connection.getInputStream()));
            JSONArray items = json.optJSONArray("items");
            StringBuilder lines = new StringBuilder();
            if (items != null) {
                int count = Math.min(items.length(), 6);
                for (int i = 0; i < count; i++) {
                    JSONObject item = items.getJSONObject(i);
                    if (lines.length() > 0) lines.append('\n');
                    lines.append(item.optString("hour")).append("  ").append(item.optString("text"));
                }
            }
            if (lines.length() == 0) lines.append("No hourly items yet.");
            return new WidgetData(
                json.optString("title", "Today"),
                json.optString("project", ""),
                lines.toString()
            );
        } catch (Exception error) {
            return new WidgetData("IELTS Planner", "Sync failed", error.getMessage());
        }
    }

    private static class WidgetData {
        final String title;
        final String project;
        final String items;

        WidgetData(String title, String project, String items) {
            this.title = title;
            this.project = project;
            this.items = items;
        }
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
}
